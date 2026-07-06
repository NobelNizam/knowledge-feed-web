/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'],
  },
  async rewrites() {
    // ponytail: env-based API target. localhost default for dev; production
    // sets API_UPSTREAM_URL (or NEXT_PUBLIC_API_URL) to the real backend.
    const target = process.env.API_UPSTREAM_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
