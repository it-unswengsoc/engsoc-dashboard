/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /_next/image isn't provisioned on this deployment's services setup, so the
  // optimizer 404s in prod — serve images straight from /public instead.
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
