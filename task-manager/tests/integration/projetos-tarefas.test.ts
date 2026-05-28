import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import prisma from "../../src/lib/prisma.js";

const app = createApp();

// Helpers para não repetir registro/login nos testes
async function criarUsuario(email = "user@email.com", nome = "Usuário") {
  const res = await request(app).post("/auth/register").send({
    nome,
    email,
    senha: "senha123",
  });
  return { token: res.body.token as string, user: res.body.user };
}

beforeEach(async () => {
  await prisma.tarefa.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.user.deleteMany();
});

// ── Projetos ──────────────────────────────────────────────────

describe("CRUD /projetos", () => {
  it("deve criar um projeto com sucesso", async () => {
    const { token } = await criarUsuario();

    const res = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Projeto Alpha", descricao: "Meu primeiro projeto" });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe("Projeto Alpha");
  });

  it("deve listar somente os projetos do usuário autenticado", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    await request(app).post("/projetos").set("Authorization", `Bearer ${t1}`).send({ nome: "P do User 1" });
    await request(app).post("/projetos").set("Authorization", `Bearer ${t2}`).send({ nome: "P do User 2" });

    const res = await request(app).get("/projetos").set("Authorization", `Bearer ${t1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe("P do User 1");
  });

  it("deve retornar 404 para projeto inexistente", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .get("/projetos/id-que-nao-existe")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("deve atualizar um projeto (dono)", async () => {
    const { token } = await criarUsuario();
    const criar = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Projeto Original" });

    const res = await request(app)
      .put(`/projetos/${criar.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Projeto Renomeado" });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Projeto Renomeado");
  });

  it("deve retornar 403 ao tentar editar projeto de outro usuário", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const criar = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${t1}`)
      .send({ nome: "Projeto do User 1" });

    const res = await request(app)
      .put(`/projetos/${criar.body.id}`)
      .set("Authorization", `Bearer ${t2}`)
      .send({ nome: "Tentando roubar" });

    expect(res.status).toBe(403);
  });

  it("deve deletar um projeto (dono)", async () => {
    const { token } = await criarUsuario();
    const criar = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Para deletar" });

    const res = await request(app)
      .delete(`/projetos/${criar.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});

// ── Tarefas ───────────────────────────────────────────────────

describe("CRUD /tarefas", () => {
  it("deve criar uma tarefa vinculada a um projeto", async () => {
    const { token } = await criarUsuario();
    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Meu Projeto" });

    const res = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "Escrever testes",
        projetoId: projeto.body.id,
        prioridade: "alta",
      });

    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe("Escrever testes");
  });

  it("deve retornar 403 ao criar tarefa em projeto alheio", async () => {
    const { token: t1 } = await criarUsuario("u1@email.com", "User 1");
    const { token: t2 } = await criarUsuario("u2@email.com", "User 2");

    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${t1}`)
      .send({ nome: "Projeto do User 1" });

    const res = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${t2}`)
      .send({ titulo: "Invasão", projetoId: projeto.body.id });

    expect(res.status).toBe(403);
  });

  it("deve fazer soft delete da tarefa", async () => {
    const { token } = await criarUsuario();
    const projeto = await request(app)
      .post("/projetos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Projeto" });

    const tarefa = await request(app)
      .post("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Tarefa para deletar", projetoId: projeto.body.id });

    const del = await request(app)
      .delete(`/tarefas/${tarefa.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(del.status).toBe(204);

    // Tarefa não deve aparecer na listagem
    const lista = await request(app)
      .get("/tarefas")
      .set("Authorization", `Bearer ${token}`)
      .query({ projetoId: projeto.body.id });

    expect(lista.body.dados).toHaveLength(0);
  });
});

// ── ADMIN ─────────────────────────────────────────────────────

describe("Autorização por papel (ADMIN)", () => {
  it("deve retornar 403 ao USER tentar acessar GET /users", async () => {
    const { token } = await criarUsuario();
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("deve permitir ADMIN acessar GET /users", async () => {
    // Cria user e promove para ADMIN direto no banco
    const { user } = await criarUsuario();
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });

    // Faz login novamente para obter token com role=ADMIN
    const login = await request(app).post("/auth/login").send({
      email: "user@email.com",
      senha: "senha123",
    });

    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
