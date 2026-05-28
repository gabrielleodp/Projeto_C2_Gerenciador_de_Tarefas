import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middlewares/authenticate.js";
import { criarTarefaSchema, atualizarTarefaSchema } from "../schemas/index.js";

const router = Router();

router.use(authenticate);

// GET /tarefas — lista tarefas do usuário autenticado
// Filtros: ?status=aberta&prioridade=alta&projetoId=xxx&page=1&limit=10
router.get("/", async (req: Request, res: Response) => {
  const { status, prioridade, projetoId, page = "1", limit = "10" } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: Record<string, any> = {
    donoId: req.usuario!.sub,
    deletadaEm: null, // exclui soft-deletadas
  };

  if (status) where.status = status;
  if (prioridade) where.prioridade = prioridade;
  if (projetoId) where.projetoId = projetoId;

  try {
    const [tarefas, total] = await prisma.$transaction([
      prisma.tarefa.findMany({
        where,
        include: { projeto: { select: { id: true, nome: true } } },
        orderBy: { criadaEm: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.tarefa.count({ where }),
    ]);

    return res.json({
      dados: tarefas,
      paginacao: {
        total,
        pagina: Number(page),
        limite: Number(limit),
        totalPaginas: Math.ceil(total / Number(limit)),
      },
    });
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// GET /tarefas/:id — busca tarefa por ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tarefa = await prisma.tarefa.findFirst({
      where: { id: req.params.id, deletadaEm: null },
      include: {
        projeto: { select: { id: true, nome: true } },
        dono: { select: { id: true, nome: true } },
      },
    });

    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });

    if (tarefa.donoId !== req.usuario!.sub && req.usuario!.role !== "ADMIN") {
      return res.status(403).json({ erro: "Acesso negado" });
    }

    return res.json(tarefa);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// POST /tarefas — cria nova tarefa
router.post("/", async (req: Request, res: Response) => {
  const resultado = criarTarefaSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(422).json({ erro: resultado.error.flatten().fieldErrors });
  }

  const { projetoId, titulo, descricao, prioridade, dataPrevista } = resultado.data;

  try {
    // Verifica se o projeto existe e pertence ao usuário
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

    if (projeto.donoId !== req.usuario!.sub) {
      return res.status(403).json({ erro: "Você não pode criar tarefas em projetos de outros usuários" });
    }

    const tarefa = await prisma.tarefa.create({
      data: {
        titulo,
        descricao,
        prioridade,
        projetoId,
        donoId: req.usuario!.sub,
        dataPrevista: dataPrevista ? new Date(dataPrevista) : null,
      },
    });
    return res.status(201).json(tarefa);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// PUT /tarefas/:id — atualiza tarefa (somente o dono)
router.put("/:id", async (req: Request, res: Response) => {
  const resultado = atualizarTarefaSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(422).json({ erro: resultado.error.flatten().fieldErrors });
  }

  try {
    const tarefa = await prisma.tarefa.findFirst({ where: { id: req.params.id, deletadaEm: null } });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });

    // Controle de propriedade
    if (tarefa.donoId !== req.usuario!.sub) {
      return res.status(403).json({ erro: "Acesso negado: você não é o dono desta tarefa" });
    }

    const { dataPrevista, ...resto } = resultado.data;
    const atualizada = await prisma.tarefa.update({
      where: { id: req.params.id },
      data: {
        ...resto,
        ...(dataPrevista ? { dataPrevista: new Date(dataPrevista) } : {}),
      },
    });
    return res.json(atualizada);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// DELETE /tarefas/:id — soft delete (somente o dono)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tarefa = await prisma.tarefa.findFirst({ where: { id: req.params.id, deletadaEm: null } });
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });

    if (tarefa.donoId !== req.usuario!.sub) {
      return res.status(403).json({ erro: "Acesso negado: você não é o dono desta tarefa" });
    }

    await prisma.tarefa.update({
      where: { id: req.params.id },
      data: { deletadaEm: new Date() },
    });

    return res.status(204).send();
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

export default router;
