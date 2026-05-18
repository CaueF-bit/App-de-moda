import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * helmet — adiciona headers de segurança HTTP (X-Frame-Options, etc.)
 *
 * CSP fica desabilitado pra simplificar: serving HTML + JS local + swagger UI
 * tudo na mesma origem. Quando for pra produção (frontend separado), volte a
 * habilitar CSP com uma policy bem definida.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

/**
 * CORS — controla quais origens podem chamar a API.
 * Use "*" só em dev. Em produção liste seus domínios reais.
 */
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

/**
 * Rate limit global — protege contra brute-force e abuso.
 * Default: 100 requests por IP a cada 60s.
 */
export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas requisições. Aguarde e tente novamente.",
    },
  },
});

/**
 * Rate limit mais agressivo para rotas sensíveis (login, register).
 * 10 tentativas a cada 15 minutos.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Tente novamente em alguns minutos.",
    },
  },
});
