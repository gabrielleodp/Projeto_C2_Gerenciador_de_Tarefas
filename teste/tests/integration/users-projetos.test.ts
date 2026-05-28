import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import prisma from "../../src/lib/prisma.js";

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────

async function criarUsuario(email = "user@email.com", nome = "Usuário") {
  const res = await request(app).post("/auth/register").send({
    nome,
    email,
    senha: "senha123",
  });
  return { token: res.body.token as string, user: res.body.user };
}

async function promoverAdmin(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
}

async function loginComo(email: string) {
  const res = await request(app).post("/auth/login").send({ email, senha: "senha123" });
  return res.body.token as string;
}

beforeEach(async () => {
  await prisma.tarefa.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.user.deleteMany();
});

// ── GET /users (ADMIN only) ───────────────────────────────────

describe("GET /users — somente ADMIN", () => {
  it("deve retornar lista de todos os usuários para ADMIN", async () => {
    const { user: u1 } = await criarUsuario("u1@email.com", "User 1");
    await criarUsuario("u2@email.com", "User 2");
    await promoverAdmin(u1.id);
    const token = await loginComo("u1@email.com");

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // Nenhum usuário deve expor senha
    res.body.forEach((u: any) => expect(u.senha).toBeUndefined());
  });

  it("deve retornar 401 sem token em GET /users", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("deve retornar 403 para USER em GET /users", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ── GET /users/:id (ADMIN only) ───────────────────────────────

describe("GET /users/:id — somente ADMIN", () => {
  it("deve retornar usuário por ID com projetos", async () => {
    const { user: target } = await criarUsuario("target@email.com", "Target");
    const { user: adminUser } = await criarUsuario("admin@email.com", "Admin");
    await promoverAdmin(adminUser.id);
    const adminToken = await loginComo("admin@email.com");

    const res = await request(app)
      .get(`/users/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(target.id);
    expect(res.body.email).toBe("target@email.com");
    expect(res.body.projetos).toBeDefined();
    expect(res.body.senha).toBeUndefined();
  });

  it("deve retornar 404 para usuário inexistente", async () => {
    const { user: adminUser } = await criarUsuario("admin@email.com", "Admin");
    await promoverAdmin(adminUser.id);
    const adminToken = await loginComo("admin@email.com");

    const res = await request(app)
      .get("/users/id-inexistente")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("deve retornar 403 para USER em GET /users/:id", async () => {
    const { token, user } = await criarUsuario();
    const res = await request(app)
      .get(`/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ── DELETE /users/:id (ADMIN only) ───────────────────────────

describe("DELETE /users/:id — somente ADMIN", () => {
  it("deve deletar usuário (ADMIN)", async () => {
    const { user: target } = await criarUsuario("target@email.com", "Target");
    const { user: adminUser } = await criarUsuario("admin@email.com", "Admin");
    await promoverAdmin(adminUser.id);
    const adminToken = await loginComo("admin@email.com");

    const res = await request(app)
      .delete(`/users/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("deve retornar 404 ao deletar usuário inexistente", async () => {
    const { user: adminUser } = await criarUsuario("admin@email.com", "Admin");
    await promoverAdmin(adminUser.id);
    const adminToken = await loginComo("admin@email.com");

    const res = await request(app)
      .delete("/users/id-inexistente")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("deve retornar 403 para USER tentando deletar outro usuário", async () => {
    const { token } = await criarUsuario("u1@email.com", "User 1");
    const { user: u2 } = await criarUsuario("u2@email.com", "User 2");

    const res = await request(app)
      .delete(`/users/${u2.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /projetos/:id ─────────────────────────────────────────

describe("GET /projetos/:id", () => {
  it("deve retornar projeto com dono e tarefas (include)", async () => {
    const { token } = await criarUsuario();
    const criar = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Projeto Detalhado", descricao: "Com detalhes" });

    const res = await request(app)
      .get(`/projetos/${criar.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.dono).toBeDefined();
    expect(res.body.tarefas).toBeDefined();
    expect(res.body.dono.senha).toBeUndefined();
  });

  it("deve retornar 403 ao tentar acessar projeto de outro usuário", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${t1}`)
      .send({ nome: "Privado" });

    const res = await request(app)
      .get(`/projetos/${projeto.body.id}`)
      .set("Authorization", `Bearer ${t2}`);

    expect(res.status).toBe(403);
  });

  it("ADMIN deve poder ver qualquer projeto", async () => {
    const { token: t1 } = await criarUsuario("dono@email.com", "Dono");
    const { user: adminUser } = await criarUsuario("admin@email.com", "Admin");
    await promoverAdmin(adminUser.id);
    const adminToken = await loginComo("admin@email.com");

    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${t1}`)
      .send({ nome: "Projeto do Dono" });

    const res = await request(app)
      .get(`/projetos/${projeto.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Projeto do Dono");
  });
});

// ── POST /projetos — validações ───────────────────────────────

describe("POST /projetos — validações", () => {
  it("deve retornar 422 para nome muito curto", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "A" });
    expect(res.status).toBe(422);
  });

  it("deve retornar 401 sem token", async () => {
    const res = await request(app).post("/projetos").send({ nome: "Sem Auth" });
    expect(res.status).toBe(401);
  });

  it("deve criar projeto com descrição opcional", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Com Descrição", descricao: "Detalhe do projeto" });

    expect(res.status).toBe(201);
    expect(res.body.descricao).toBe("Detalhe do projeto");
  });
});

// ── PUT /projetos — validações ────────────────────────────────

describe("PUT /projetos/:id — validações", () => {
  it("deve retornar 404 ao atualizar projeto inexistente", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .put("/projetos/id-inexistente")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Novo Nome" });
    expect(res.status).toBe(404);
  });

  it("deve retornar 422 para nome muito curto na atualização", async () => {
    const { token } = await criarUsuario();
    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Projeto OK" });

    const res = await request(app)
      .put(`/projetos/${projeto.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "X" });

    expect(res.status).toBe(422);
  });
});

// ── DELETE /projetos — validações ────────────────────────────

describe("DELETE /projetos/:id — validações", () => {
  it("deve retornar 404 ao deletar projeto inexistente", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .delete("/projetos/id-inexistente")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("deve retornar 403 ao USER tentar deletar projeto de outro usuário", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${t1}`)
      .send({ nome: "Do User 1" });

    const res = await request(app)
      .delete(`/projetos/${projeto.body.id}`)
      .set("Authorization", `Bearer ${t2}`);

    expect(res.status).toBe(403);
  });
});

// ── Rota raiz ─────────────────────────────────────────────────

describe("GET /", () => {
  it("deve retornar informações da API", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.projeto).toBe("Task Manager API");
    expect(res.body.rotas).toContain("/auth");
  });
});
