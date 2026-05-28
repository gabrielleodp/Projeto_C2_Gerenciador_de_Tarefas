import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { hashSenha, verificarSenha, gerarToken } from "../lib/auth.js";
import { authenticate } from "../middlewares/authenticate.js";
import { registerSchema, loginSchema } from "../schemas/index.js";

const router = Router();

// POST /auth/register — cria nova conta
router.post("/register", async (req: Request, res: Response) => {
  const resultado = registerSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(422).json({ erro: resultado.error.flatten().fieldErrors });
  }

  const { nome, email, senha } = resultado.data;

  try {
    const senhaHash = await hashSenha(senha);
    const user = await prisma.user.create({
      data: { nome, email, senha: senhaHash },
      select: { id: true, nome: true, email: true, role: true, criadoEm: true },
    });

    const token = gerarToken({ sub: user.id, role: user.role });
    return res.status(201).json({ user, token });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ erro: "E-mail já cadastrado" });
    }
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// POST /auth/login — retorna JWT
router.post("/login", async (req: Request, res: Response) => {
  const resultado = loginSchema.safeParse(req.body);
  if (!resultado.success) {
    return res.status(422).json({ erro: resultado.error.flatten().fieldErrors });
  }

  const { email, senha } = resultado.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    const senhaCorreta = await verificarSenha(senha, user.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    const token = gerarToken({ sub: user.id, role: user.role });
    return res.json({
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      token,
    });
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// GET /auth/me — dados do usuário autenticado
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.usuario!.sub },
      select: { id: true, nome: true, email: true, role: true, criadoEm: true },
    });

    if (!user) return res.status(404).json({ erro: "Usuário não encontrado" });

    return res.json(user);
  } catch {
    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

export default router;
