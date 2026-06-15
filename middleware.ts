import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("TOKEN:", request.cookies.get("accessToken"));
  // const token = request.cookies.get("accessToken");
  // const { pathname } = request.nextUrl;

  // // Public routes
  // const isAuthRoute =
  //   pathname.startsWith("/(auth)") ||
  //   pathname === "/login" ||
  //   pathname === "/register";

  // // Protected routes
  // const isAdminRoute = pathname.startsWith("/(admin)");
  // const isOrgRoute = pathname.startsWith("/(org)");
  // const isScribingRoute = pathname.startsWith("/(scribing)");

  // if (!token && !isAuthRoute) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // TODO: Add role-based redirects
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
