import pino from "pino";
import { env, isDevelopment } from "./env";

/**
 * Logger central da aplicação.
 *
 * - Em desenvolvimento: usa pino-pretty (colorido, legível)
 * - Em produção: JSON estruturado (pronto pra ELK, Datadog, Grafana, etc.)
 *
 * Uso:
 *   import { logger } from "./config/logger";
 *   logger.info({ userId }, "usuário logado");
 *   logger.error({ err }, "falha ao processar");
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "authorization",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Middleware Express para logar cada request HTTP.
 * Mantemos simples (sem pino-http) pra evitar mais uma dependência.
 */
export function requestLogger(req: any, res: any, next: any): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const log = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      durationMs,
    };

    if (res.statusCode >= 500) {
      logger.error(log, "request finalizado com erro de servidor");
    } else if (res.statusCode >= 400) {
      logger.warn(log, "request finalizado com erro de cliente");
    } else {
      logger.info(log, "request finalizado");
    }
  });

  next();
}
