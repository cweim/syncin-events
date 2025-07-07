import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Removed static export for dynamic routes
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig;