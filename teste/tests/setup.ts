import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";

// Banco isolado para testes
process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.JWT_SECRET = "test-secret-key";
process.env.NODE_ENV = "test";

// Cria e migra o banco de testes antes de todos os testes
execSync("npx prisma migrate deploy", { stdio: "inherit" });

// Limpa o banco de testes ao final
afterAll(() => {
  if (existsSync("./prisma/test.db")) {
    unlinkSync("./prisma/test.db");
  }
});
