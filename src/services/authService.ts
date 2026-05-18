import argon2 from "argon2";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { createUser, findUserByEmail, findUserById } from "../db/user.repository";
import {
  ConflictError,
  UnauthorizedError,
} from "../errors/AppError";

/**
 * Serviço de autenticação.
 *
 * - Senhas guardadas com argon2id (vencedor do PHC). Resistente a GPUs.
 * - Tokens JWT com expiração configurável via JWT_EXPIRES_IN.
 *
 * Em produção pense também em:
 *   - refresh tokens com rotação
 *   - invalidação por usuário (token version) — útil em "logout de todos os dispositivos"
 *   - rate limit nas rotas de auth (já temos via middleware)
 */

const JWT_ALGORITHM = "HS256" as const;

export interface JwtPayload {
  sub: string;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (typeof decoded === "string" || !("sub" in decoded)) {
      throw new UnauthorizedError("Token inválido.");
    }
    return {
      sub: String((decoded as any).sub),
      email: String((decoded as any).email ?? ""),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Token inválido ou expirado.");
  }
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ id: string; email: string; name: string; token: string }> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("Já existe uma conta com esse e-mail.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email: input.email,
    name: input.name,
    passwordHash,
  });

  const token = signToken({ sub: user.id, email: user.email });
  return { id: user.id, email: user.email, name: user.name, token };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string; name: string; token: string }> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    // Mesma mensagem para email errado ou senha errada (evita enumeração de usuários).
    throw new UnauthorizedError("Credenciais inválidas.");
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Credenciais inválidas.");
  }

  const token = signToken({ sub: user.id, email: user.email });
  return { id: user.id, email: user.email, name: user.name, token };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new UnauthorizedError("Usuário não encontrado.");
  return { id: user.id, email: user.email, name: user.name };
}
