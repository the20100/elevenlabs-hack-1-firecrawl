import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "@elevenlabs/client": "@11labs/client",
    },
  },
};

export default nextConfig;
