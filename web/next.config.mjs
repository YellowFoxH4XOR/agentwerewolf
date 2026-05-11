/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",  // small Docker image — copies only runtime deps
  // typedRoutes is incompatible with dynamic IDs we build at runtime
  // (game IDs, agent slugs, etc.); keep paths typed as plain string.
};

export default nextConfig;
