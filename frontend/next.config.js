/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { dev }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
