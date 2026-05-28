import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

// ── Senha ────────────────────────────────────────────────────

export async function hashSenha(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verificarSenha(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT ──────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // user id
  role: string;
}

export function gerarToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verificarToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
