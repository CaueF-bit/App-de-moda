import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Carrega o arquivo .env na raiz do projeto.
loadEnv();

/**
 * Schema de validação de variáveis de ambiente.
 * Se algo estiver faltando ou em formato inválido, o servidor não sobe.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z
    .string()
    .default("3000")
    .transform((value) => Number(value))
    .pipe(z.number().int().positive()),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET precisa ter no mínimo 32 caracteres"),

  JWT_EXPIRES_IN: z.string().default("7d"),

  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  AI_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),

  // Chave secreta do painel de métricas (/admin.html).
  // Vazia = painel desativado (nega qualquer acesso).
  ADMIN_KEY: z.string().optional().default(""),

  CORS_ORIGIN: z.string().default("*"),

  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("60000")
    .transform((value) => Number(value))
    .pipe(z.number().int().positive()),

  RATE_LIMIT_MAX: z
    .string()
    .default("100")
    .transform((value) => Number(value))
    .pipe(z.number().int().positive()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Configuração inválida nas variáveis de ambiente:\n",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Variáveis de ambiente inválidas. Verifique seu .env");
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
