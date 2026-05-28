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

async function criarProjeto(token: string, nome = "Projeto Teste") {
  const res = await request(app)
    .post("/projetos")
    .set("Authorization", `Bearer ${token}`)
    .send({ nome });
  return res.body;
}

async function criarTarefa(token: string, projetoId: string, titulo = "Tarefa Teste") {
  const res = await request(app)
    .post("/tarefas")
    .set("Authorization", `Bearer ${token}`)
    .send({ titulo, projetoId });
  return res.body;
}

// Limpa o banco antes de cada teste
beforeEach(async () => {
  await prisma.tarefa.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.user.deleteMany();
});

// ── GET /tarefas ──────────────────────────────────────────────

describe("GET /tarefas", () => {
  it("deve listar tarefas do usuário com paginação", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);

    await criarTarefa(token, projeto.id, "Tarefa 1");
    await criarTarefa(token, projeto.id, "Tarefa 2");

    const res = await request(app)
      .get("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .query({ page: "1", limit: "10" });

    expect(res.status).toBe(200);
    expect(res.body.dados).toHaveLength(2);
    expect(res.body.paginacao.total).toBe(2);
    expect(res.body.paginacao.pagina).toBe(1);
  });

  it("deve filtrar tarefas por status", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id, "Tarefa Aberta");

    // Atualiza status para em_andamento
    await request(app)
      .put(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "em_andamento" });

    const res = await request(app)
      .get("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .query({ status: "em_andamento" });

    expect(res.status).toBe(200);
    expect(res.body.dados).toHaveLength(1);
    expect(res.body.dados[0].status).toBe("em_andamento");
  });

  it("deve filtrar tarefas por prioridade", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);

    await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Urgente", projetoId: projeto.id, prioridade: "alta" });

    await criarTarefa(token, projeto.id, "Normal"); // prioridade padrão: media

    const res = await request(app)
      .get("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .query({ prioridade: "alta" });

    expect(res.status).toBe(200);
    expect(res.body.dados).toHaveLength(1);
    expect(res.body.dados[0].prioridade).toBe("alta");
  });

  it("deve filtrar tarefas por projetoId", async () => {
    const { token } = await criarUsuario();
    const projeto1 = await criarProjeto(token, "Projeto 1");
    const projeto2 = await criarProjeto(token, "Projeto 2");

    await criarTarefa(token, projeto1.id, "Tarefa do P1");
    await criarTarefa(token, projeto2.id, "Tarefa do P2");

    const res = await request(app)
      .get("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .query({ projetoId: projeto1.id });

    expect(res.status).toBe(200);
    expect(res.body.dados).toHaveLength(1);
    expect(res.body.dados[0].titulo).toBe("Tarefa do P1");
  });

  it("deve retornar 401 sem token", async () => {
    const res = await request(app).get("/tarefas");
    expect(res.status).toBe(401);
  });
});

// ── GET /tarefas/:id ──────────────────────────────────────────

describe("GET /tarefas/:id", () => {
  it("deve retornar tarefa por ID com relacionamentos", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id);

    const res = await request(app)
      .get(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tarefa.id);
    expect(res.body.projeto).toBeDefined();
    expect(res.body.dono).toBeDefined();
    // senha nunca deve aparecer
    expect(res.body.dono.senha).toBeUndefined();
  });

  it("deve retornar 404 para tarefa inexistente", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .get("/tarefas/id-inexistente")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("deve retornar 403 ao tentar acessar tarefa de outro usuário", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const projeto = await criarProjeto(t1);
    const tarefa = await criarTarefa(t1, projeto.id);

    const res = await request(app)
      .get(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${t2}`);

    expect(res.status).toBe(403);
  });

  it("ADMIN deve poder acessar tarefa de qualquer usuário", async () => {
    const { token: t1, user: u1 } = await criarUsuario("dono@email.com", "Dono");
    const { user: adminUser } = await criarUsuario("admin@email.com", "Admin");

    // Promove para ADMIN
    await prisma.user.update({ where: { id: adminUser.id }, data: { role: "ADMIN" } });
    const loginAdmin = await request(app).post("/auth/login").send({
      email: "admin@email.com",
      senha: "senha123",
    });
    const adminToken = loginAdmin.body.token;

    const projeto = await criarProjeto(t1);
    const tarefa = await criarTarefa(t1, projeto.id);

    const res = await request(app)
      .get(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tarefa.id);
  });
});

// ── PUT /tarefas/:id ──────────────────────────────────────────

describe("PUT /tarefas/:id", () => {
  it("deve atualizar título e status da tarefa (dono)", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id);

    const res = await request(app)
      .put(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Título Atualizado", status: "concluida" });

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe("Título Atualizado");
    expect(res.body.status).toBe("concluida");
  });

  it("deve atualizar prioridade da tarefa", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id);

    const res = await request(app)
      .put(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ prioridade: "baixa" });

    expect(res.status).toBe(200);
    expect(res.body.prioridade).toBe("baixa");
  });

  it("deve retornar 422 para status inválido", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id);

    const res = await request(app)
      .put(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "invalido" });

    expect(res.status).toBe(422);
  });

  it("deve retornar 403 ao tentar editar tarefa de outro usuário", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const projeto = await criarProjeto(t1);
    const tarefa = await criarTarefa(t1, projeto.id);

    const res = await request(app)
      .put(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${t2}`)
      .send({ titulo: "Hackeado" });

    expect(res.status).toBe(403);
  });

  it("deve retornar 404 para tarefa inexistente", async () => {
    const { token } = await criarUsuario();

    const res = await request(app)
      .put("/tarefas/id-inexistente")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Qualquer coisa" });

    expect(res.status).toBe(404);
  });

  it("deve retornar 422 para título muito curto", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id);

    const res = await request(app)
      .put(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "X" });

    expect(res.status).toBe(422);
  });
});

// ── DELETE /tarefas/:id (soft delete) ────────────────────────

describe("DELETE /tarefas/:id", () => {
  it("deve retornar 403 ao tentar deletar tarefa de outro usuário", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const projeto = await criarProjeto(t1);
    const tarefa = await criarTarefa(t1, projeto.id);

    const res = await request(app)
      .delete(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${t2}`);

    expect(res.status).toBe(403);
  });

  it("deve retornar 404 ao tentar deletar tarefa inexistente", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .delete("/tarefas/id-inexistente")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("não deve retornar tarefa soft-deletada em GET /:id", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);
    const tarefa = await criarTarefa(token, projeto.id);

    await request(app)
      .delete(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .get(`/tarefas/${tarefa.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ── POST /tarefas validações ──────────────────────────────────

describe("POST /tarefas — validações", () => {
  it("deve retornar 422 para título muito curto", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);

    const res = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "A", projetoId: projeto.id });

    expect(res.status).toBe(422);
  });

  it("deve retornar 422 sem projetoId", async () => {
    const { token } = await criarUsuario();

    const res = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Sem projeto" });

    expect(res.status).toBe(422);
  });

  it("deve retornar 404 para projetoId inexistente", async () => {
    const { token } = await criarUsuario();

    const res = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Tarefa Órfã", projetoId: "projeto-inexistente" });

    expect(res.status).toBe(404);
  });

  it("deve criar tarefa com dataPrevista", async () => {
    const { token } = await criarUsuario();
    const projeto = await criarProjeto(token);

    const res = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "Tarefa com data",
        projetoId: projeto.id,
        dataPrevista: "2027-12-31T23:59:59Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.dataPrevista).toBeTruthy();
  });
});
