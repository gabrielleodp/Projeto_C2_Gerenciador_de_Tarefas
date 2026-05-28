import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import prisma from "../../src/lib/prisma.js";

const app = createApp();

// Limpa a tabela de usuários antes de cada teste
beforeEach(async () => {
  await prisma.tarefa.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.user.deleteMany();
});

describe("POST /auth/register", () => {
  it("deve criar um usuário com sucesso e retornar token", async () => {
    const res = await request(app).post("/auth/register").send({
      nome: "Maria Souza",
      email: "maria@email.com",
      senha: "senha123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("maria@email.com");
    expect(res.body.user.senha).toBeUndefined(); // senha nunca retornada
  });

  it("deve retornar 409 para e-mail duplicado", async () => {
    await request(app).post("/auth/register").send({
      nome: "Maria",
      email: "maria@email.com",
      senha: "senha123",
    });

    const res = await request(app).post("/auth/register").send({
      nome: "Outro Nome",
      email: "maria@email.com",
      senha: "outrasenha",
    });

    expect(res.status).toBe(409);
  });

  it("deve retornar 422 para senha curta", async () => {
    const res = await request(app).post("/auth/register").send({
      nome: "João",
      email: "joao@email.com",
      senha: "123",
    });

    expect(res.status).toBe(422);
  });

  it("deve retornar 422 para e-mail inválido", async () => {
    const res = await request(app).post("/auth/register").send({
      nome: "João",
      email: "nao-e-email",
      senha: "senha123",
    });

    expect(res.status).toBe(422);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/register").send({
      nome: "Test User",
      email: "test@email.com",
      senha: "senha123",
    });
  });

  it("deve fazer login com sucesso e retornar token", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "test@email.com",
      senha: "senha123",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.senha).toBeUndefined();
  });

  it("deve retornar 401 para credenciais erradas", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "test@email.com",
      senha: "senha-errada",
    });

    expect(res.status).toBe(401);
  });

  it("deve retornar 401 para e-mail inexistente", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "naoexiste@email.com",
      senha: "senha123",
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("deve retornar os dados do usuário autenticado", async () => {
    const reg = await request(app).post("/auth/register").send({
      nome: "Carlos",
      email: "carlos@email.com",
      senha: "senha123",
    });
    const token = reg.body.token;

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("carlos@email.com");
  });

  it("deve retornar 401 sem token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("deve retornar 401 com token inválido", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer token-falso");
    expect(res.status).toBe(401);
  });
});
