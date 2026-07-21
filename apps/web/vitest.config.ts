import { defineConfig } from "vitest/config";

export default defineConfig({
  // Automatic JSX runtime so .tsx tests (e.g. the react-pdf document) compile
  // without importing React.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
