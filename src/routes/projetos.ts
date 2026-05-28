import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middlewares/authenticate.js";
import { criarProjetoSchema, atualizarProjetoSchema } from "../schemas/index.js";

const router = Router();

// Todas as rotas de projetos exigem autenticação
router.use(authenticate);

// GET /projetos — lista projetos do usuário autenticado
router.get("/", async (req: Request, res: Response) => {
  try {
    const projetos = await prisma.projeto.findMany({
      where: { donoId: req.usuario!.sub },
      include: {
        _count: { select: { tarefas: true } },
      },
      orderBy: { criadoEm: "desc" },
    });
    return res.json(projetos);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// GET /projetos/:id — busca projeto por ID (com tarefas)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const projeto = await prisma.projeto.findUnique({
      where: { id: req.params.id },
      include: {
        dono: { select: { id: true, nome: true, email: true } },
        tarefas: {
          where: { deletadaEm: null },
          orderBy: { criadaEm: "desc" },
        },
      },
    });

    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

    // Verifica se o projeto pertence ao usuário autenticado ou se é ADMIN
    if (projeto.donoId !== req.usuario!.sub && req.usuario!.role !== "ADMIN") {
      return res.status(403).json({ erro: "Acesso negado: você não é o dono deste projeto" });
    }

    return res.json(projeto);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// POST /projetos — cria novo projeto
router.post("/", async (req: Request, res: Response) => {
  const resultado = criarProjetoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(422).json({ erro: resultado.error.flatten().fieldErrors });
  }

  try {
    const projeto = await prisma.projeto.create({
      data: {
        ...resultado.data,
        donoId: req.usuario!.sub,
      },
    });
    return res.status(201).json(projeto);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// PUT /projetos/:id — atualiza projeto (somente o dono)
router.put("/:id", async (req: Request, res: Response) => {
  const resultado = atualizarProjetoSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(422).json({ erro: resultado.error.flatten().fieldErrors });
  }

  try {
    const projeto = await prisma.projeto.findUnique({ where: { id: req.params.id } });
    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

    // Controle de propriedade
    if (projeto.donoId !== req.usuario!.sub) {
      return res.status(403).json({ erro: "Acesso negado: você não é o dono deste projeto" });
    }

    const atualizado = await prisma.projeto.update({
      where: { id: req.params.id },
      data: resultado.data,
    });
    return res.json(atualizado);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// DELETE /projetos/:id — remove projeto (somente o dono)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const projeto = await prisma.projeto.findUnique({ where: { id: req.params.id } });
    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

    // Controle de propriedade
    if (projeto.donoId !== req.usuario!.sub) {
      return res.status(403).json({ erro: "Acesso negado: você não é o dono deste projeto" });
    }

    await prisma.projeto.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

export default router;
