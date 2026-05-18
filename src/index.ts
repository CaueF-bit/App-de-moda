import { createServer } from "./server";
import { env, isProduction } from "./config/env";
import { logger } from "./config/logger";
import { disconnectPrisma } from "./db/prisma";
import {
  DEFAULT_SEED_EMAIL,
  DEFAULT_SEED_PASSWORD,
  DEFAULT_SEED_USER_ID,
  bootstrapMockData,
} from "./dev/mockData";

/**
 * Entry point real do servidor.
 *
 * `server.ts` exporta apenas a função pura `createServer()` (usada nos testes).
 * Aqui tratamos: seed inicial, listen, graceful shutdown.
 *
 * IMPORTANTE: o seed (bootstrapMockData) CHAMA resetMockData() — isto é,
 * apaga TODOS os dados antes de inserir os mocks. Por isso ele só roda em
 * desenvolvimento. Em produção, os dados reais nunca devem ser destruídos.
 */
async function start(): Promise<void> {
  const app = createServer();

  // Seed só roda fora de produção
  if (!isProduction) {
    try {
      const seed = await bootstrapMockData();
      logger.info(
        {
          seedUserId: seed.userId,
          seedEmail: seed.email,
          wardrobeCount: seed.wardrobeCount,
        },
        "Seed inicial carregado",
      );
    } catch (err) {
      logger.warn(
        { err },
        "Falha ao carregar seed inicial — verifique se você rodou as migrations (npx prisma migrate dev)",
      );
    }
  }

  // Em produção, `listen('0.0.0.0', PORT)` é essencial: a maioria das
  // plataformas (Railway, Render, Docker) só consegue rotear tráfego
  // pro container se ele estiver escutando em todas as interfaces.
  const host = isProduction ? "0.0.0.0" : "localhost";

  const server = app.listen(env.PORT, host, () => {
    logger.info(
      {
        port: env.PORT,
        host,
        env: env.NODE_ENV,
        aiEnabled: env.AI_ENABLED,
      },
      `Servidor rodando em http://${host}:${env.PORT}`,
    );
    if (!isProduction) {
      logger.info(
        `Login demo: email="${DEFAULT_SEED_EMAIL}" senha="${DEFAULT_SEED_PASSWORD}" userId="${DEFAULT_SEED_USER_ID}"`,
      );
    }
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Encerrando servidor...");
    server.close(async () => {
      await disconnectPrisma();
      logger.info("Servidor encerrado.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.fatal({ err }, "Falha fatal ao iniciar o servidor");
  process.exit(1);
});
