import { Request, Response, NextFunction } from "express";
import { verificarToken, JwtPayload } from "../lib/auth.js";

// Extende o tipo do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  const token = authHeader.slice(7);

  try {
    req.usuario = verificarToken(token);
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}
