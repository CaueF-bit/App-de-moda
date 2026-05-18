import { UnauthorizedError } from "../errors/AppError";
import { JwtPayload, verifyToken } from "../services/authService";

/**
 * Middleware que valida o JWT vindo do header Authorization: Bearer <token>.
 *
 * Anexa o usuário decodificado em `req.user` pra controllers usarem.
 * Joga 401 se faltar/for inválido.
 */
export function authenticate(req: any, _res: any, next: any): void {
  try {
    const header: string | undefined = req.headers?.authorization;
    if (!header) throw new UnauthorizedError("Token ausente.");

    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedError("Formato de Authorization inválido. Use 'Bearer <token>'.");
    }

    const payload: JwtPayload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Helper de tipagem fraca pra controllers acessarem req.user com segurança.
 */
export function getAuthenticatedUserId(req: any): string {
  if (!req.user?.id) throw new UnauthorizedError("Usuário não autenticado.");
  return req.user.id;
}
