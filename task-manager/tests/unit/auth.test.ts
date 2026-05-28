import { describe, it, expect } from "vitest";
import { hashSenha, verificarSenha, gerarToken, verificarToken } from "../../src/lib/auth.js";

// ── Testes de senha ───────────────────────────────────────────

describe("hashSenha", () => {
  it("deve retornar um hash diferente do texto original", async () => {
    const plain = "minha-senha-123";
    const hash = await hashSenha(plain);
    expect(hash).not.toBe(plain);
  });

  it("deve gerar hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const plain = "minha-senha-123";
    const hash1 = await hashSenha(plain);
    const hash2 = await hashSenha(plain);
    expect(hash1).not.toBe(hash2);
  });
});

describe("verificarSenha", () => {
  it("deve retornar true quando a senha está correta", async () => {
    const plain = "senha-correta";
    const hash = await hashSenha(plain);
    const resultado = await verificarSenha(plain, hash);
    expect(resultado).toBe(true);
  });

  it("deve retornar false quando a senha está errada", async () => {
    const hash = await hashSenha("senha-correta");
    const resultado = await verificarSenha("senha-errada", hash);
    expect(resultado).toBe(false);
  });
});

// ── Testes de token ───────────────────────────────────────────

describe("gerarToken", () => {
  it("deve gerar um token JWT não vazio", () => {
    const token = gerarToken({ sub: "user-1", role: "USER" });
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });
});

describe("verificarToken", () => {
  it("deve decodificar corretamente o payload do token", () => {
    const payload = { sub: "user-abc", role: "ADMIN" };
    const token = gerarToken(payload);
    const decoded = verificarToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe(payload.role);
  });

  it("deve lançar erro para token inválido", () => {
    expect(() => verificarToken("token-invalido")).toThrow();
  });

  it("deve lançar erro para token adulterado", () => {
    const token = gerarToken({ sub: "user-1", role: "USER" });
    const adulterado = token.slice(0, -5) + "xxxxx";
    expect(() => verificarToken(adulterado)).toThrow();
  });
});
