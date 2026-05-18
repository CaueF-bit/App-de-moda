import { prisma } from "./prisma";
import { ClothingCategory } from "../types/fashion";
import { BadRequestError } from "../errors/AppError";

export type PreferenceScoreMap<Key extends string = string> = Partial<Record<Key, number>>;

export interface PreferenceWeights {
  favoriteColors: PreferenceScoreMap;
  favoriteCategories: PreferenceScoreMap<ClothingCategory>;
  favoriteOccasions: PreferenceScoreMap;
}

function createDefaultPreferenceWeights(): PreferenceWeights {
  return {
    favoriteColors: {},
    favoriteCategories: {},
    favoriteOccasions: {},
  };
}

function rowToWeights(row: {
  favoriteColors: string;
  favoriteCategories: string;
  favoriteOccasions: string;
}): PreferenceWeights {
  return {
    favoriteColors: JSON.parse(row.favoriteColors || "{}"),
    favoriteCategories: JSON.parse(row.favoriteCategories || "{}"),
    favoriteOccasions: JSON.parse(row.favoriteOccasions || "{}"),
  };
}

function validateUserId(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) {
    throw new BadRequestError("O userId é obrigatório para acessar as preferências.");
  }
  return normalized;
}

export async function getPreferenceWeights(userId: string): Promise<PreferenceWeights> {
  const id = validateUserId(userId);
  const existing = await prisma.preference.findUnique({ where: { userId: id } });

  if (existing) return rowToWeights(existing);

  const created = await prisma.preference.create({
    data: {
      userId: id,
      favoriteColors: "{}",
      favoriteCategories: "{}",
      favoriteOccasions: "{}",
    },
  });

  return rowToWeights(created);
}

function mergeScores<Key extends string>(
  current: PreferenceScoreMap<Key>,
  updates?: PreferenceScoreMap<Key>,
): PreferenceScoreMap<Key> {
  if (!updates) return { ...current };

  const merged = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    merged[key as Key] = Math.max(0, Number(value.toFixed(2)));
  }
  return merged;
}

export async function updatePreferenceWeights(
  userId: string,
  updates: Partial<PreferenceWeights>,
): Promise<PreferenceWeights> {
  const id = validateUserId(userId);
  const current = await getPreferenceWeights(id);

  const next: PreferenceWeights = {
    favoriteColors: mergeScores(current.favoriteColors, updates.favoriteColors),
    favoriteCategories: mergeScores(current.favoriteCategories, updates.favoriteCategories),
    favoriteOccasions: mergeScores(current.favoriteOccasions, updates.favoriteOccasions),
  };

  await prisma.preference.update({
    where: { userId: id },
    data: {
      favoriteColors: JSON.stringify(next.favoriteColors),
      favoriteCategories: JSON.stringify(next.favoriteCategories),
      favoriteOccasions: JSON.stringify(next.favoriteOccasions),
    },
  });

  return next;
}

export async function resetPreferenceWeights(userId: string): Promise<PreferenceWeights> {
  const id = validateUserId(userId);
  const defaults = createDefaultPreferenceWeights();

  await prisma.preference.upsert({
    where: { userId: id },
    update: {
      favoriteColors: "{}",
      favoriteCategories: "{}",
      favoriteOccasions: "{}",
    },
    create: {
      userId: id,
      favoriteColors: "{}",
      favoriteCategories: "{}",
      favoriteOccasions: "{}",
    },
  });

  return defaults;
}

export async function clearPreferenceWeights(): Promise<void> {
  await prisma.preference.deleteMany();
}
