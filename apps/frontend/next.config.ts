import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configure Turbopack for monorepo/Docker builds
  turbopack: {
    root: path.resolve(__dirname, '..', '..'),  // Absolute path to workspace root
  },
  // Proxy API requests to internal backend
  async rewrites() {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:3040';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
