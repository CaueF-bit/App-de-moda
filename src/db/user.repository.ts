import { prisma } from "./prisma";

/**
 * Repositório do User (autenticação).
 *
 * Mantemos apenas o que o auth precisa. Dados de estilo/perfil ficam em
 * UserProfile (relacionado 1:1).
 */

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  return user;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<UserRecord> {
  return prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name.trim(),
    },
  });
}

export async function clearUsers(): Promise<void> {
  await prisma.user.deleteMany();
}
