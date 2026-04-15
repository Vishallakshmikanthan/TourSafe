import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler is still experimental — disable it to avoid build
  // overhead and potential rendering bugs that contribute to lag.
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
