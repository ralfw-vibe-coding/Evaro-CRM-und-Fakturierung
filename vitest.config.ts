import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend/src", import.meta.url)),
    },
  },
  test: {
    include: ["backend/src/**/*.test.ts", "frontend/src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Coverage requirement applies to the domain logic (RPUs) and the
      // orchestration layer (reactors); see tech-stack.md.
      include: ["backend/src/domain/rpus/**", "backend/src/reactors/**"],
      exclude: ["**/__tests/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
