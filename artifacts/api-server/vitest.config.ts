import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // DB-backed integration tests share fixtures; run serially
    fileParallelism: false,
    testTimeout: 30000,
  },
});
