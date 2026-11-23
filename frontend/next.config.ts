import type { NextConfig } from "next";

// Extract API domain from environment variable for image configuration
const getApiDomain = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  try {
    const url = new URL(apiUrl);
    return url.origin; // Returns protocol + hostname + port
  } catch {
    return 'http://localhost:8000';
  }
};

const nextConfig: NextConfig = {
  async rewrites() {
    const target = process.env.DJANGO_API_PROXY_TARGET || 'http://localhost:8000';
    return [
      // Preserve trailing slashes: Django's POST endpoints must not redirect uploads.
      { source: '/api/assistant/:path*', destination: `${target}/api/assistant/:path*/` },
      ...(process.env.DJANGO_API_PROXY_TARGET
        ? [{ source: '/media/:path*', destination: `${target}/media/:path*` }] : []),
    ];
  },
  // Django owns the API's trailing-slash convention; avoid Next's opposite redirect.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains for production flexibility
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP domains (for development)
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
