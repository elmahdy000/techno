const nextConfig = {
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    allowedDevOrigins: [".monkeycode-ai.live"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
