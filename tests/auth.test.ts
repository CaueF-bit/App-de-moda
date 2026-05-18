import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createServer } from "../src/server";
import { prisma } from "../src/db/prisma";

const app = createServer();

describe("Auth flow", () => {
  beforeAll(async () => {
    // Limpa qualquer usuário de testes anteriores com o mesmo email.
    await prisma.user.deleteMany({ where: { email: "teste-auth@example.com" } });
  });

  it("POST /auth/register cria usuário e retorna token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "teste-auth@example.com",
        password: "senha123456",
        name: "Teste Auth",
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.email).toBe("teste-auth@example.com");
  });

  it("POST /auth/register falha com email duplicado", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "teste-auth@example.com",
        password: "outraSenha123",
        name: "Outro",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("POST /auth/register valida senha curta", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "x@x.com", password: "123", name: "x" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/login retorna token com credenciais corretas", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "teste-auth@example.com", password: "senha123456" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("POST /auth/login rejeita senha errada", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "teste-auth@example.com", password: "errada" });

    expect(res.status).toBe(401);
  });

  it("GET /auth/me sem token retorna 401", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
