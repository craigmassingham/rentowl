import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.eval.ts"],
    // Evals make real API calls
    testTimeout: 180_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
