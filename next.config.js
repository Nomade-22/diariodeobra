/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['@neondatabase/serverless', 'ws'],
};
module.exports = nextConfig;
