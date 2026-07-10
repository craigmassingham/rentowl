import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rentowl/ui", "@rentowl/shared", "@rentowl/db"],
};

export default nextConfig;
