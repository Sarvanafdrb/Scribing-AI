import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow long consultation audio to pass through the /api/backend proxy.
  experimental: {
    proxyClientMaxBodySize: "500mb",
  },
  async rewrites() {
    return [
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
      {
        source: "/patients/:id/edit",
        destination: "/patients/edit/:id",
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
