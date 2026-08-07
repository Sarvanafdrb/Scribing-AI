import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
/**
 * Long consultation audio through /api/backend needs elevated duration.
 * Vercel Hobby max is 300s; Pro can raise to 800 via maxDuration.
 * Prefer direct S3 PUT (presigned) for large files so the proxy is not on the critical path.
 */
export const maxDuration = 300;

const getApiProxyTarget = () =>
  (process.env.API_PROXY_TARGET || "http://localhost:5000/api").replace(
    /\/$/,
    "",
  );

const STRIP_REQUEST_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  // Avoid upstream compression; fetch() decompresses but we must not
  // forward content-encoding to the browser with a decompressed body.
  "accept-encoding",
  // Never forward browser cookies — they can exceed Vercel/header limits (HTTP 431).
  "cookie",
]);

const ALLOWED_REQUEST_HEADERS = new Set([
  "authorization",
  "content-type",
  "accept",
  "x-workspace-id",
  "x-requested-with",
]);

const STRIP_RESPONSE_HEADERS = new Set([
  ...STRIP_REQUEST_HEADERS,
  "content-encoding",
  "set-cookie",
]);

const buildTargetUrl = (request: NextRequest, path: string[]) => {
  const targetPath = path.join("/");
  const url = new URL(`${getApiProxyTarget()}/${targetPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
};

const buildForwardHeaders = (request: NextRequest) => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (STRIP_REQUEST_HEADERS.has(lower)) return;
    if (!ALLOWED_REQUEST_HEADERS.has(lower)) return;
    headers.set(key, value);
  });

  return headers;
};

const buildResponseHeaders = (response: Response) => {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  return headers;
};

const isBackendUnreachable = (error: unknown) => {
  if (!(error instanceof Error)) return false;

  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = cause?.code;
  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return true;
  }

  return (
    error instanceof TypeError &&
    /fetch failed|failed to fetch|network/i.test(error.message)
  );
};

async function proxyRequest(request: NextRequest, path: string[]) {
  const url = buildTargetUrl(request, path);
  const headers = buildForwardHeaders(request);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    // Stream the body through — buffering multi‑hundred‑MB audio OOMs the
    // Next process and makes the API look "unreachable".
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const response = await fetch(url.toString(), init);
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: buildResponseHeaders(response),
    });
  } catch (error) {
    const target = getApiProxyTarget();
    const unreachable = isBackendUnreachable(error);

    console.error(`API proxy failed for ${url.toString()}:`, error);

    return NextResponse.json(
      {
        success: false,
        message: unreachable
          ? `Cannot reach the API server at ${target}. Start the backend with "npm run dev" in the scribing-ai-api folder.`
          : "The API server is temporarily unavailable. Please try again.",
      },
      { status: 503 },
    );
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
