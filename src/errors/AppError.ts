/**
 * Classe base para erros operacionais conhecidos (ex: usuário não encontrado,
 * input inválido). Diferencia esses erros de bugs/exceções inesperadas.
 *
 * Todo erro que extende AppError vai pro middleware de erro com status correto
 * e mensagem amigável. Erros que NÃO extendem AppError viram 500 Internal Server Error.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados") {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados inválidos", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Muitas requisições, aguarde um momento") {
    super(message, 429, "RATE_LIMITED");
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "Erro em serviço externo", details?: unknown) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", details);
  }
}
