import { NextRequest, NextResponse } from "next/server";

const getApiProxyTarget = () =>
  (process.env.API_PROXY_TARGET || "http://localhost:5000/api").replace(
    /\/$/,
    "",
  );

const HOP_BY_HOP_HEADERS = new Set([
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
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  return headers;
};

const buildResponseHeaders = (response: Response) => {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
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

  const response = await fetch(url.toString(), init);

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildResponseHeaders(response),
  });
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
