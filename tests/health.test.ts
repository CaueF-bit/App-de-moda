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

describe("GET /api/info", () => {
  const app = createServer();

  it("retorna info da API", async () => {
    // A raiz "/" agora serve a página web (public/index.html);
    // o JSON informativo da API ficou em /api/info.
    const res = await request(app).get("/api/info");
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
