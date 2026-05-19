import { prisma } from "./prisma";
import {
  BodyType,
  ClothingCategory,
  FitPreference,
  PersonalColorPalette,
  UserMeasurements,
  UserProfile,
} from "../types/fashion";
import { BadRequestError } from "../errors/AppError";

/**
 * Repositório do UserProfile usando Prisma + SQLite.
 *
 * Mantém a mesma assinatura pública das funções anteriores (em memória)
 * para que os services não precisem mudar.
 *
 * Campos JSON (preferredFits, measurements, etc.) são serializados/deserializados
 * aqui, isolando o resto do código dessa preocupação.
 */

interface PrismaProfileRow {
  userId: string;
  bodyType: string;
  preferredFits: string;
  measurements: string;
  personalPalette: string;
  dislikedPatterns: string | null;
  favoriteCategories: string | null;
  fragrancePreferences: string | null;
  budgetLimit: number;
}

function rowToProfile(row: PrismaProfileRow): UserProfile {
  return {
    userId: row.userId,
    bodyType: row.bodyType as BodyType,
    measurements: JSON.parse(row.measurements) as UserMeasurements,
    preferredFits: JSON.parse(row.preferredFits) as FitPreference[],
    personalPalette: JSON.parse(row.personalPalette) as PersonalColorPalette,
    dislikedPatterns: row.dislikedPatterns ? (JSON.parse(row.dislikedPatterns) as string[]) : undefined,
    favoriteCategories: row.favoriteCategories
      ? (JSON.parse(row.favoriteCategories) as ClothingCategory[])
      : undefined,
    fragrancePreferences: row.fragrancePreferences
      ? (JSON.parse(row.fragrancePreferences) as string[])
      : undefined,
    budgetLimit: row.budgetLimit,
  };
}

function profileToRow(profile: UserProfile) {
  return {
    userId: profile.userId,
    bodyType: profile.bodyType,
    preferredFits: JSON.stringify(profile.preferredFits),
    measurements: JSON.stringify(profile.measurements ?? {}),
    personalPalette: JSON.stringify(profile.personalPalette),
    dislikedPatterns: profile.dislikedPatterns ? JSON.stringify(profile.dislikedPatterns) : null,
    favoriteCategories: profile.favoriteCategories
      ? JSON.stringify(profile.favoriteCategories)
      : null,
    fragrancePreferences: profile.fragrancePreferences
      ? JSON.stringify(profile.fragrancePreferences)
      : null,
    budgetLimit: profile.budgetLimit,
  };
}

function validate(profile: UserProfile): void {
  if (!profile.userId?.trim()) {
    throw new BadRequestError("O userId do perfil é obrigatório.");
  }
  if (profile.budgetLimit < 0) {
    throw new BadRequestError("O budgetLimit não pode ser negativo.");
  }
  if (!profile.preferredFits || profile.preferredFits.length === 0) {
    throw new BadRequestError("O perfil precisa ter pelo menos um fit preferido.");
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  validate(profile);
  const data = profileToRow(profile);

  const saved = await prisma.userProfile.upsert({
    where: { userId: data.userId },
    update: data,
    create: data,
  });

  return rowToProfile(saved as PrismaProfileRow);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const row = await prisma.userProfile.findUnique({
    where: { userId: userId.trim() },
  });
  return row ? rowToProfile(row as PrismaProfileRow) : null;
}

/**
 * Perfil padrão criado automaticamente no cadastro, para que todo usuário
 * novo já consiga gerar looks e montar malas sem travar. A tela de
 * onboarding (próximo passo) vai permitir personalizar estes valores.
 */
export function buildDefaultUserProfile(userId: string): UserProfile {
  return {
    userId: userId.trim(),
    bodyType: "retangulo",
    measurements: {},
    preferredFits: ["regular", "slim"],
    personalPalette: {
      primaryColors: ["preto", "branco", "cinza", "azul"],
      secondaryColors: ["bege", "marinho", "verde"],
      avoidColors: [],
      contrastLevel: "medio",
      undertone: "neutro",
    },
    dislikedPatterns: [],
    favoriteCategories: [],
    fragrancePreferences: [],
    budgetLimit: 300,
  };
}

/**
 * Retorna o perfil do usuário, criando um perfil padrão se ainda não existir.
 * Garante que nenhuma conta fique sem perfil (rede de segurança para contas
 * antigas, criadas antes do perfil padrão automático no cadastro).
 */
export async function getOrCreateUserProfile(userId: string): Promise<UserProfile> {
  const existing = await getUserProfile(userId);
  if (existing) return existing;
  return saveUserProfile(buildDefaultUserProfile(userId));
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile | null> {
  const current = await getUserProfile(userId);
  if (!current) return null;

  const merged: UserProfile = {
    ...current,
    ...updates,
    userId: userId.trim(),
    measurements: updates.measurements ?? current.measurements,
    personalPalette: updates.personalPalette ?? current.personalPalette,
  };

  return saveUserProfile(merged);
}

export async function deleteUserProfile(userId: string): Promise<boolean> {
  try {
    await prisma.userProfile.delete({ where: { userId: userId.trim() } });
    return true;
  } catch {
    return false;
  }
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  const rows = await prisma.userProfile.findMany();
  return rows.map((row) => rowToProfile(row as PrismaProfileRow));
}

export async function clearUserProfiles(): Promise<void> {
  await prisma.userProfile.deleteMany();
}
