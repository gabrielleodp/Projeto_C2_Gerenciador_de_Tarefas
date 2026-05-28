import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  criarProjetoSchema,
  criarTarefaSchema,
} from "../../src/schemas/index.js";

describe("registerSchema", () => {
  it("deve aceitar dados válidos", () => {
    const resultado = registerSchema.safeParse({
      nome: "João Silva",
      email: "joao@email.com",
      senha: "123456",
    });
    expect(resultado.success).toBe(true);
  });

  it("deve rejeitar e-mail inválido", () => {
    const resultado = registerSchema.safeParse({
      nome: "João",
      email: "nao-e-email",
      senha: "123456",
    });
    expect(resultado.success).toBe(false);
  });

  it("deve rejeitar senha com menos de 6 caracteres", () => {
    const resultado = registerSchema.safeParse({
      nome: "João",
      email: "joao@email.com",
      senha: "123",
    });
    expect(resultado.success).toBe(false);
  });

  it("deve rejeitar nome com menos de 2 caracteres", () => {
    const resultado = registerSchema.safeParse({
      nome: "J",
      email: "joao@email.com",
      senha: "123456",
    });
    expect(resultado.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("deve aceitar credenciais válidas", () => {
    const resultado = loginSchema.safeParse({
      email: "joao@email.com",
      senha: "qualquercoisa",
    });
    expect(resultado.success).toBe(true);
  });

  it("deve rejeitar sem senha", () => {
    const resultado = loginSchema.safeParse({ email: "joao@email.com" });
    expect(resultado.success).toBe(false);
  });
});

describe("criarProjetoSchema", () => {
  it("deve aceitar projeto com nome válido", () => {
    const resultado = criarProjetoSchema.safeParse({ nome: "Meu Projeto" });
    expect(resultado.success).toBe(true);
  });

  it("deve rejeitar nome muito curto", () => {
    const resultado = criarProjetoSchema.safeParse({ nome: "A" });
    expect(resultado.success).toBe(false);
  });
});

describe("criarTarefaSchema", () => {
  it("deve aceitar tarefa válida", () => {
    const resultado = criarTarefaSchema.safeParse({
      titulo: "Estudar TypeScript",
      projetoId: "proj-123",
      prioridade: "alta",
    });
    expect(resultado.success).toBe(true);
  });

  it("deve rejeitar prioridade inválida", () => {
    const resultado = criarTarefaSchema.safeParse({
      titulo: "Tarefa",
      projetoId: "proj-123",
      prioridade: "urgente", // não existe
    });
    expect(resultado.success).toBe(false);
  });

  it("deve rejeitar sem projetoId", () => {
    const resultado = criarTarefaSchema.safeParse({ titulo: "Tarefa" });
    expect(resultado.success).toBe(false);
  });
});
