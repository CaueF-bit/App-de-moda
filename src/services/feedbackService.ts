import {
  getPreferenceWeights,
  PreferenceWeights,
  updatePreferenceWeights,
} from "../db/preference.repository";
import { getOutfitById, saveOutfitFeedback } from "../db/outfit.repository";
import { ClothingCategory, OutfitFeedbackInput } from "../types/fashion";

const COLOR_TAGS = ["preto", "branco", "azul", "cinza", "bege", "marinho", "marrom"] as const;
const CATEGORY_TAGS: ClothingCategory[] = [
  "camiseta",
  "camisa",
  "jaqueta",
  "blazer",
  "calca",
  "bermuda",
  "shorts",
  "tenis",
  "sapato",
  "bota",
  "acessorio",
  "perfume",
  "outro",
];

export interface FeedbackProcessingResult {
  updatedPreferences: PreferenceWeights;
  learnedSignals: string[];
  deltaApplied: {
    favoriteColors: Record<string, number>;
    favoriteCategories: Partial<Record<ClothingCategory, number>>;
    favoriteOccasions: Record<string, number>;
  };
}

export async function registerOutfitFeedback(
  input: OutfitFeedbackInput,
): Promise<FeedbackProcessingResult> {
  validateFeedbackInput(input);

  const normalizedInput = normalizeFeedbackInput(input);
  const savedOutfit = await getOutfitById(normalizedInput.outfitId);

  if (!savedOutfit || savedOutfit.userId !== normalizedInput.userId) {
    throw new Error("O outfit informado nao foi encontrado para esse usuario.");
  }

  const preferences = await getPreferenceWeights(normalizedInput.userId);
  const delta = normalizedInput.action === "like" ? 1 : -1;

  const updatedOccasions = { ...preferences.favoriteOccasions };
  const updatedCategories: Partial<Record<ClothingCategory, number>> = {
    ...preferences.favoriteCategories,
  };
  const updatedColors = { ...preferences.favoriteColors };

  const deltaApplied = {
    favoriteColors: {} as Record<string, number>,
    favoriteCategories: {} as Partial<Record<ClothingCategory, number>>,
    favoriteOccasions: {} as Record<string, number>,
  };

  if (normalizedInput.occasion) {
    incrementStringScore(updatedOccasions, normalizedInput.occasion, delta);
    incrementStringScore(deltaApplied.favoriteOccasions, normalizedInput.occasion, delta);
  }

  for (const tag of normalizedInput.tags ?? []) {
    if (isColorTag(tag)) {
      incrementStringScore(updatedColors, tag, delta);
      incrementStringScore(deltaApplied.favoriteColors, tag, delta);
      continue;
    }

    if (isClothingCategory(tag)) {
      incrementCategoryScore(updatedCategories, tag, delta);
      incrementCategoryScore(deltaApplied.favoriteCategories, tag, delta);
    }
  }

  const updatedPreferences = await updatePreferenceWeights(normalizedInput.userId, {
    favoriteOccasions: updatedOccasions,
    favoriteCategories: updatedCategories,
    favoriteColors: updatedColors,
  });

  await saveOutfitFeedback(normalizedInput);

  return {
    updatedPreferences,
    learnedSignals: buildLearnedSignals(normalizedInput, deltaApplied),
    deltaApplied,
  };
}

export async function previewFeedbackImpact(
  input: OutfitFeedbackInput,
): Promise<FeedbackProcessingResult["deltaApplied"]> {
  validateFeedbackInput(input);

  const normalizedInput = normalizeFeedbackInput(input);
  const savedOutfit = await getOutfitById(normalizedInput.outfitId);

  if (!savedOutfit || savedOutfit.userId !== normalizedInput.userId) {
    throw new Error("O outfit informado nao foi encontrado para esse usuario.");
  }

  const delta = normalizedInput.action === "like" ? 1 : -1;
  const preview = {
    favoriteColors: {} as Record<string, number>,
    favoriteCategories: {} as Partial<Record<ClothingCategory, number>>,
    favoriteOccasions: {} as Record<string, number>,
  };

  if (normalizedInput.occasion) {
    incrementStringScore(preview.favoriteOccasions, normalizedInput.occasion, delta);
  }

  for (const tag of normalizedInput.tags ?? []) {
    if (isColorTag(tag)) {
      incrementStringScore(preview.favoriteColors, tag, delta);
      continue;
    }

    if (isClothingCategory(tag)) {
      incrementCategoryScore(preview.favoriteCategories, tag, delta);
    }
  }

  return preview;
}

function buildLearnedSignals(
  input: OutfitFeedbackInput,
  deltaApplied: FeedbackProcessingResult["deltaApplied"],
): string[] {
  const prefix = input.action === "like" ? "Reforcado" : "Reduzido";
  const signals: string[] = [];

  for (const color of Object.keys(deltaApplied.favoriteColors)) {
    signals.push(`${prefix} sinal para a cor ${color}.`);
  }

  for (const category of Object.keys(deltaApplied.favoriteCategories)) {
    signals.push(`${prefix} sinal para a categoria ${category}.`);
  }

  for (const occasion of Object.keys(deltaApplied.favoriteOccasions)) {
    signals.push(`${prefix} sinal para a ocasiao ${occasion}.`);
  }

  return signals;
}

function normalizeFeedbackInput(input: OutfitFeedbackInput): OutfitFeedbackInput {
  return {
    ...input,
    userId: input.userId.trim(),
    outfitId: input.outfitId.trim(),
    occasion: input.occasion?.trim().toLowerCase() || undefined,
    tags: input.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  };
}

function validateFeedbackInput(input: OutfitFeedbackInput): void {
  if (!input.userId.trim()) {
    throw new Error("O userId e obrigatorio para registrar feedback.");
  }

  if (!input.outfitId.trim()) {
    throw new Error("O outfitId e obrigatorio para registrar feedback.");
  }

  if (input.action !== "like" && input.action !== "dislike") {
    throw new Error("A acao de feedback precisa ser like ou dislike.");
  }
}

function incrementStringScore(
  map: Partial<Record<string, number>>,
  key: string,
  delta: number,
): void {
  const normalizedKey = key.trim().toLowerCase();

  if (!normalizedKey) {
    return;
  }

  map[normalizedKey] = Number(((map[normalizedKey] ?? 0) + delta).toFixed(2));
}

function incrementCategoryScore(
  map: Partial<Record<ClothingCategory, number>>,
  category: ClothingCategory,
  delta: number,
): void {
  map[category] = Number(((map[category] ?? 0) + delta).toFixed(2));
}

function isColorTag(tag: string): boolean {
  return COLOR_TAGS.some((colorTag) => colorTag === tag);
}

function isClothingCategory(tag: string): tag is ClothingCategory {
  return CATEGORY_TAGS.some((categoryTag) => categoryTag === tag);
}
