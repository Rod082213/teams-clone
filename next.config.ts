// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['emoji-picker-react'], // Add this if needed after testing
};

export default nextConfig;