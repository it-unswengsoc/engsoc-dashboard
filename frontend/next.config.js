/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Points at the deployed backend so local frontend dev doesn't need
        // a locally-running backend/Postgres for plain API calls. This
        // won't make "Sign in with Google" work from localhost though —
        // the deployed backend's FRONTEND_URL redirects back to the
        // deployed site, not here. Test that flow on the deployed site.
        source: '/api/backend/:path*',
        destination: 'https://engsoc-dashboard.vercel.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
