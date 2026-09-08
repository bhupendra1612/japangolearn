import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(repositoryRoot, "apps/mobile"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
  },
});
