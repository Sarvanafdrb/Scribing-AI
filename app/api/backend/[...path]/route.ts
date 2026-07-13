import { NextRequest, NextResponse } from "next/server";

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

async function proxyRequest(request: NextRequest, path: string[]) {
  const url = buildTargetUrl(request, path);
  const headers = buildForwardHeaders(request);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
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
    const isConnectionRefused =
      error instanceof TypeError ||
      (error instanceof Error &&
        "cause" in error &&
        typeof error.cause === "object" &&
        error.cause !== null &&
        "code" in error.cause &&
        error.cause.code === "ECONNREFUSED");

    console.error(`API proxy failed for ${url.toString()}:`, error);

    return NextResponse.json(
      {
        success: false,
        message: isConnectionRefused
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
