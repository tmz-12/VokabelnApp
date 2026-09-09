import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", maxWorkers: 1, setupFiles: ["./tests/setup.ts"], exclude: ["tests/e2e/**", "node_modules/**"], coverage: { reporter: ["text", "html"] } },
});
