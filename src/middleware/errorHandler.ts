import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

/**
 * Middleware central de tratamento de erros.
 * Deve ser registrado por ÚLTIMO no Express, com 4 parâmetros (err, req, res, next).
 *
 * - AppError       → usa status/código definidos pela própria classe
 * - ZodError       → vira 422 com detalhes dos campos inválidos
 * - SyntaxError    → 400 (JSON malformado)
 * - Qualquer outro → 500 (não vaza stack trace em produção)
 */
export function errorHandler(err: any, _req: any, res: any, _next: any): void {
  // Erros de domínio conhecidos
  if (err instanceof AppError) {
    logger.warn(
      { err: { message: err.message, code: err.code, details: err.details } },
      "AppError tratado",
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Erros de validação Zod
  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors;
    logger.warn({ fieldErrors }, "Erro de validação Zod");

    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados de entrada inválidos.",
        details: fieldErrors,
      },
    });
    return;
  }

  // JSON malformado vindo do express.json()
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({
      error: {
        code: "MALFORMED_JSON",
        message: "Corpo da requisição não é um JSON válido.",
      },
    });
    return;
  }

  // Bugs/exceções inesperadas
  logger.error(
    {
      err: {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
      },
    },
    "Erro inesperado",
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "Ocorreu um erro interno. Tente novamente."
        : err?.message || "Erro interno",
      ...(isProduction ? {} : { stack: err?.stack }),
    },
  });
}

/**
 * Middleware 404 para rotas não encontradas.
 * Registrar ANTES do errorHandler.
 */
export function notFoundHandler(req: any, res: any, _next: any): void {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Rota não encontrada: ${req.method} ${req.url}`,
    },
  });
}

/**
 * Wrapper para handlers async que encaminha erros pro errorHandler
 * sem precisar repetir try/catch em todo controller.
 *
 * Uso:
 *   router.post("/x", asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<unknown>,
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
