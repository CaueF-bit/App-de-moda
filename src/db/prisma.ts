import { PrismaClient } from "@prisma/client";
import { env, isProduction } from "../config/env";
import { logger } from "../config/logger";

/**
 * Cliente Prisma singleton.
 *
 * Em dev guardamos no global pra evitar criar uma nova conexão a cada
 * hot-reload (problema clássico com tsx watch / nodemon).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction
      ? ["error", "warn"]
      : ["query", "error", "warn"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

prisma.$on?.("error" as never, (e: unknown) => {
  logger.error({ err: e }, "prisma error");
});

// Conexão é lazy — não precisamos chamar $connect() explicitamente,
// mas adicionar handler para shutdown limpo.
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Exporta DATABASE_URL pra módulos que precisam diagnosticar (não usado direto).
export const DATABASE_URL = env.DATABASE_URL;
