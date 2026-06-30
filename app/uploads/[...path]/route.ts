import { NextRequest, NextResponse } from "next/server";

const getUploadsProxyTarget = () =>
  (process.env.API_PROXY_TARGET || "http://localhost:5000/api")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

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
  "accept-encoding",
]);

const STRIP_RESPONSE_HEADERS = new Set([
  ...STRIP_REQUEST_HEADERS,
  "content-encoding",
]);

const buildTargetUrl = (request: NextRequest, path: string[]) => {
  const targetPath = path.join("/");
  const url = new URL(`${getUploadsProxyTarget()}/uploads/${targetPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
};

const buildForwardHeaders = (request: NextRequest) => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (STRIP_REQUEST_HEADERS.has(key.toLowerCase())) return;
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

  try {
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      redirect: "manual",
    });

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: buildResponseHeaders(response),
    });
  } catch (error) {
    console.error(`Uploads proxy failed for ${url.toString()}:`, error);

    return new NextResponse("Recording file unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
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
export const HEAD = handle;
