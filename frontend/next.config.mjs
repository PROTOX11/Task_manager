/** @type {import('next').NextConfig} */
// Must match backend PORT (e.g. backend/.env → PORT=5000). Override in frontend/.env.local: BACKEND_URL=http://localhost:5000
const backend =
  process.env.BACKEND_URL?.replace(/\/+$/, "") || "http://localhost:5000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
