import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router = Router();

// Todas as rotas exigem autenticação
router.use(authenticate);

// GET /users — lista todos os usuários (somente ADMIN)
router.get("/", authorize("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        criadoEm: true,
        _count: { select: { projetos: true, tarefas: true } },
      },
    });
    return res.json(users);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// GET /users/:id — busca usuário por ID (somente ADMIN)
router.get("/:id", authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        criadoEm: true,
        projetos: { select: { id: true, nome: true, criadoEm: true } },
      },
    });

    if (!user) return res.status(404).json({ erro: "Usuário não encontrado" });
    return res.json(user);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// DELETE /users/:id — remove usuário (somente ADMIN)
router.delete("/:id", authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ erro: "Usuário não encontrado" });
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

export default router;
