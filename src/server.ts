import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { requestLogger } from "./config/logger";
import { openapiSpec } from "./config/openapi";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimit, corsMiddleware, securityHeaders } from "./middleware/security";
import { authenticate } from "./middleware/authenticate";

import authRoutes from "./api/auth.routes";
import outfitRoutes from "./api/outfit.routes";
import feedbackRoutes from "./api/feedback.routes";
import packingRoutes from "./api/packing.routes";
import devRoutes from "./api/dev.routes";

/**
 * Monta a aplicação Express. Exportada pra ser usada em testes (supertest)
 * sem precisar abrir uma porta. O bootstrap (listen, seed, graceful shutdown)
 * fica em src/index.ts.
 */
export function createServer() {
  const app = express();

  // Atrás do proxy da Vercel: confia no primeiro hop para que o
  // express-rate-limit leia o IP real do header X-Forwarded-For.
  app.set("trust proxy", 1);

  // --- Middlewares globais ---
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(apiRateLimit);

  // --- Frontend estático (página web em /) ---
  // Serve a pasta /public na raiz. Se houver public/index.html,
  // ele é retornado quando o usuário acessa http://localhost:3000.
  app.use(express.static(path.join(__dirname, "..", "public")));

  // --- Info da API em JSON (movido pra /api/info, fora do "/" pra dar lugar à página) ---
  app.get("/api/info", (_req, res) => {
    res.status(200).json({
      name: "app-de-moda-api",
      status: "ok",
      version: "1.0.0",
      docs: "/docs",
      endpoints: {
        health: "GET /health",
        auth: {
          register: "POST /auth/register",
          login: "POST /auth/login",
          me: "GET /auth/me (Bearer token)",
        },
        api: {
          generateOutfit: "POST /api/outfit (autenticado)",
          feedback: "POST /api/feedback (autenticado)",
          feedbackPreview: "POST /api/feedback/preview (autenticado)",
          packing: "POST /api/packing (autenticado)",
        },
        dev: env.NODE_ENV === "development" ? "/api/dev/*" : undefined,
      },
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    });
  });

  // --- Documentação Swagger ---
  // openapiSpec é um const literal (readonly). Clonamos pra um objeto mutável.
  const specForSwagger = JSON.parse(JSON.stringify(openapiSpec));
  app.use("/docs", swaggerUi.serve);
  app.get(
    "/docs",
    swaggerUi.setup(specForSwagger, {
      customSiteTitle: "App de Moda API — Docs",
    }),
  );
  app.get("/openapi.json", (_req, res) => res.json(openapiSpec));

  // --- Auth (público) ---
  app.use("/auth", authRoutes);

  // --- API protegida (autenticação aplicada em cada router separado) ---
  app.use("/api", authenticate);
  app.use("/api", outfitRoutes);
  app.use("/api", feedbackRoutes);
  app.use("/api", packingRoutes);

  // --- Rotas de seed/reset só em dev ---
  if (env.NODE_ENV !== "production") {
    app.use("/api/dev", devRoutes);
  }

  // --- 404 + Error handler (sempre por último) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
