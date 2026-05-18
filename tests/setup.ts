import { config as loadEnv } from "dotenv";

/**
 * Setup global dos testes — carrega .env.test se existir, senão usa .env padrão
 * com algumas variáveis sobrescritas para isolamento.
 */
loadEnv({ path: ".env.test" });
loadEnv(); // fallback

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.AI_ENABLED = "false";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-com-pelo-menos-32-caracteres";
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./prisma/test.db";
