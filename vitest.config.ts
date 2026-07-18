import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // The Express app + JSON-file DB are process-global; keep test files
    // sequential so they don't race on shared state.
    fileParallelism: false,
  },
});
