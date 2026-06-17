import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
