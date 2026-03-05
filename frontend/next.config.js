/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable for Docker deployment
  // Disable static optimization completely
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Disable SSR for all pages to avoid Context Provider issues
  experimental: {
    appDir: true,
  },
  // Avoid "Unable to snapshot resolve dependencies" (webpack PackFileCacheStrategy) in dev
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
