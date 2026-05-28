import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts"],
    },
    // Roda os testes em série para evitar conflito de banco
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
