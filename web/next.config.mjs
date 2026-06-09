/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }];
  },
};
export default nextConfig;
