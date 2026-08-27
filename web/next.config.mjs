/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained production server (.next/standalone) — the Docker image
  // ships only traced files instead of the whole node_modules tree.
  output: 'standalone',
  // Keep pdfkit out of the server bundle so it loads its font data from disk.
  serverExternalPackages: ['pdfkit'],
  reactStrictMode: true,
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }];
  },
  async redirects() {
    // /okoli was folded into /apartman — keep old links and bookmarks working.
    return [
      { source: '/okoli', destination: '/apartman', permanent: true },
      // las-charcas trip was renamed to banos-de-lodo
      {
        source: '/tipy-na-vylety/las-charcas',
        destination: '/tipy-na-vylety/banos-de-lodo',
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
