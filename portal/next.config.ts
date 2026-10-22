import type { NextConfig } from "next";

const gatewayUrl = process.env.GATEWAY_URL ?? "http://store-nginx:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/storage/:path*", destination: `${gatewayUrl}/storage/:path*` }];
  },
};

export default nextConfig;
