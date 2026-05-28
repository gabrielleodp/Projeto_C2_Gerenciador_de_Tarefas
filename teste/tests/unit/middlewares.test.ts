import { describe, it, expect, vi } from "vitest";
import { authenticate } from "../../src/middlewares/authenticate.js";
import { authorize } from "../../src/middlewares/authorize.js";
import { gerarToken } from "../../src/lib/auth.js";
import type { Request, Response, NextFunction } from "express";

// ── Helpers para mock ─────────────────────────────────────────

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

// ── authenticate middleware ───────────────────────────────────

describe("authenticate middleware", () => {
  it("deve chamar next() com token válido e popular req.usuario", () => {
    const token = gerarToken({ sub: "user-1", role: "USER" });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).usuario).toBeDefined();
    expect((req as any).usuario.sub).toBe("user-1");
    expect((req as any).usuario.role).toBe("USER");
  });

  it("deve retornar 401 sem header Authorization", () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve retornar 401 com header sem prefixo Bearer", () => {
    const req = mockReq({ headers: { authorization: "Token abc123" } });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve retornar 401 com token inválido", () => {
    const req = mockReq({ headers: { authorization: "Bearer token-invalido" } });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── authorize middleware ──────────────────────────────────────

describe("authorize middleware", () => {
  it("deve chamar next() quando o role do usuário está na lista", () => {
    const req = mockReq() as any;
    req.usuario = { sub: "user-1", role: "ADMIN" };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authorize("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("deve retornar 403 quando o role não está na lista", () => {
    const req = mockReq() as any;
    req.usuario = { sub: "user-1", role: "USER" };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authorize("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("deve aceitar múltiplos roles", () => {
    const req = mockReq() as any;
    req.usuario = { sub: "user-1", role: "MODERATOR" };
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authorize("ADMIN", "MODERATOR")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("deve retornar 401 quando req.usuario não está definido", () => {
    const req = mockReq() as any;
    // sem req.usuario
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authorize("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
