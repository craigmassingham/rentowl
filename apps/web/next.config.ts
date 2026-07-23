import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@rentowl/ui",
    "@rentowl/shared",
    "@rentowl/db",
    "@rentowl/prompts",
    "@rentowl/integrations",
  ],
  // Two things are read from disk at runtime (invisible to Next's import
  // tracer, so they must be listed explicitly): the clause library
  // (@rentowl/shared/clauses) and the TA generation system prompt
  // (@rentowl/prompts/tenancy-agreements/generate.system.md). Every route
  // that imports generateTenancyAgreement — directly or via the agreement
  // server action — needs both globs, or the route 500s on Vercel.
  outputFileTracingIncludes: {
    "/app/tenancies/**": [
      "../../docs/clauses/**",
      "../../packages/prompts/tenancy-agreements/*.md",
    ],
    // Bare route, no trailing segment — "/app/onboarding/**" would require
    // one and silently match nothing (verified via the .next trace manifest).
    "/app/onboarding": [
      "../../docs/clauses/**",
      "../../packages/prompts/tenancy-agreements/*.md",
    ],
  },
};

export default nextConfig;
