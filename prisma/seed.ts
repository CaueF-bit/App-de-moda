/**
 * Seed da conta demo — NÃO destrutivo (usa upsert).
 *
 * Cria/atualiza:
 *   email: demo@app-de-moda.dev
 *   senha: demo12345
 * com perfil de estilo + 8 peças de guarda-roupa.
 *
 * Rodar apontando para o banco desejado:
 *   DATABASE_URL=... JWT_SECRET=... NODE_ENV=production npx tsx prisma/seed.ts
 */
import { seedDemoData } from "../src/dev/mockData";
import { disconnectPrisma } from "../src/db/prisma";

seedDemoData()
  .then((r) => {
    console.log("✓ Conta demo criada/atualizada:", r);
  })
  .catch((err) => {
    console.error("✗ Falha no seed:", err);
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
