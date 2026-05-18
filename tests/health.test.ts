import { describe, it, expect } from "vitest";
import request from "supertest";
import { createServer } from "../src/server";

describe("GET /health", () => {
  const app = createServer();

  it("retorna 200 e status healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(typeof res.body.timestamp).toBe("string");
  });
});

describe("GET / (root)", () => {
  const app = createServer();

  it("retorna info da API", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("app-de-moda-api");
  });
});

describe("404", () => {
  const app = createServer();

  it("retorna erro estruturado em rota inexistente", async () => {
    const res = await request(app).get("/rota-que-nao-existe");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
