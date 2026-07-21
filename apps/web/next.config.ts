import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@rentowl/ui",
    "@rentowl/shared",
    "@rentowl/db",
    "@rentowl/prompts",
    "@rentowl/integrations",
  ],
  // The clause loader (@rentowl/shared/clauses) reads docs/clauses/*.md from
  // disk at runtime. Ship those files with the serverless bundle so TA
  // generation works on Vercel (see docs/clauses/README.md).
  outputFileTracingIncludes: {
    "/app/tenancies/**": ["../../docs/clauses/**"],
  },
};

export default nextConfig;
