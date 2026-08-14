const nextConfig = {
  serverExternalPackages: ["@prisma/client"],
  allowedDevOrigins: [".monkeycode-ai.live"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
