import { Request, Response, NextFunction } from "express";

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    if (!roles.includes(usuario.role)) {
      return res.status(403).json({ erro: "Acesso negado: permissão insuficiente" });
    }

    next();
  };
}
