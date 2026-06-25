import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET || "http://localhost:5000/api";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
      {
        source: "/organizations/:id/edit",
        destination: "/organizations/edit/:id",
      },
      {
        source: "/organizations/:id/settings",
        destination: "/organizations/settings/:id",
      },
      {
        source: "/organizations/:id/users",
        destination: "/organizations/users/:id",
      },
      {
        source: "/users/:id/edit",
        destination: "/users/edit/:id",
      },
      {
        source: "/roles/:id/edit",
        destination: "/roles/edit/:id",
      },
      {
        source: "/sessions/:id/edit",
        destination: "/sessions/edit/:id",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin/organizations/:path*",
        destination: "/organizations/:path*",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
