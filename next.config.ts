import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    // On Vercel, /api/* is served by the FastAPI function in api/index.py.
    // Locally, proxy to the standalone uvicorn process.
    if (process.env.VERCEL || process.env.VERCEL_ENV) return [];
    const api = process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:8765";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
