import { z } from "zod";

// ── Auth ─────────────────────────────────────────────────────

export const registerSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});

// ── Projeto ──────────────────────────────────────────────────

export const criarProjetoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  descricao: z.string().optional(),
});

export const atualizarProjetoSchema = criarProjetoSchema.partial();

// ── Tarefa ───────────────────────────────────────────────────

const PRIORIDADES = ["baixa", "media", "alta"] as const;
const STATUS = ["aberta", "em_andamento", "concluida"] as const;

export const criarTarefaSchema = z.object({
  titulo: z.string().min(2, "Título deve ter ao menos 2 caracteres"),
  descricao: z.string().optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
  dataPrevista: z.string().datetime({ offset: true }).optional(),
  projetoId: z.string().min(1, "projetoId é obrigatório"),
});

export const atualizarTarefaSchema = z.object({
  titulo: z.string().min(2).optional(),
  descricao: z.string().optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
  status: z.enum(STATUS).optional(),
  dataPrevista: z.string().datetime({ offset: true }).optional(),
});
