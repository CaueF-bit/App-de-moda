import { prisma } from "./prisma";
import {
  ClothingCategory,
  FragranceSuggestion,
  OutfitFeedbackAction,
  OutfitFeedbackInput,
  SavedOutfit,
  WardrobeItem,
} from "../types/fashion";
import { BadRequestError } from "../errors/AppError";

/**
 * Repositório de outfits salvos. Os "filhos" do outfit (upper, lower, shoes,
 * accessories, fragrance, missingItems) ficam serializados num campo `payload`
 * JSON pra evitar tabelas extras nesse MVP. Ao crescer, vale modelar relações.
 */

interface PrismaOutfitRow {
  id: string;
  userId: string;
  title: string;
  reasoning: string;
  occasion: string | null;
  score: number;
  payload: string;
  feedback: string | null;
  feedbackTags: string | null;
  createdAt: Date;
}

interface OutfitPayload {
  upper?: WardrobeItem;
  lower?: WardrobeItem;
  layer?: WardrobeItem;
  shoes?: WardrobeItem;
  accessories?: WardrobeItem[];
  fragrance?: FragranceSuggestion;
  missingItems?: { category: ClothingCategory | string; reason: string }[];
}

function rowToOutfit(row: PrismaOutfitRow): SavedOutfit {
  const payload = JSON.parse(row.payload) as OutfitPayload;
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    reasoning: row.reasoning,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
    occasion: row.occasion ?? undefined,
    feedback: (row.feedback ?? undefined) as OutfitFeedbackAction | undefined,
    feedbackTags: row.feedbackTags ? (JSON.parse(row.feedbackTags) as string[]) : undefined,
    ...payload,
  };
}

function outfitToRow(outfit: SavedOutfit) {
  const payload: OutfitPayload = {
    upper: outfit.upper,
    lower: outfit.lower,
    layer: outfit.layer,
    shoes: outfit.shoes,
    accessories: outfit.accessories,
    fragrance: outfit.fragrance,
    missingItems: outfit.missingItems,
  };

  return {
    id: outfit.id.trim(),
    userId: outfit.userId.trim(),
    title: outfit.title.trim(),
    reasoning: outfit.reasoning.trim(),
    occasion: outfit.occasion ? outfit.occasion.trim() : null,
    score: outfit.score,
    payload: JSON.stringify(payload),
    feedback: outfit.feedback ?? null,
    feedbackTags: outfit.feedbackTags ? JSON.stringify(outfit.feedbackTags) : null,
  };
}

function validate(outfit: SavedOutfit): void {
  if (!outfit.id?.trim()) throw new BadRequestError("O id do outfit é obrigatório.");
  if (!outfit.userId?.trim()) throw new BadRequestError("O userId do outfit é obrigatório.");
  if (!outfit.title?.trim()) throw new BadRequestError("O título do outfit é obrigatório.");
}

export async function saveOutfit(outfit: SavedOutfit): Promise<SavedOutfit> {
  validate(outfit);
  const data = outfitToRow(outfit);

  const saved = await prisma.outfit.upsert({
    where: { id: data.id },
    update: data,
    create: data,
  });

  return rowToOutfit(saved as PrismaOutfitRow);
}

export async function getOutfitById(id: string): Promise<SavedOutfit | null> {
  const row = await prisma.outfit.findUnique({ where: { id: id.trim() } });
  return row ? rowToOutfit(row as PrismaOutfitRow) : null;
}

export async function listOutfitsByUser(userId: string): Promise<SavedOutfit[]> {
  const rows = await prisma.outfit.findMany({
    where: { userId: userId.trim() },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => rowToOutfit(r as PrismaOutfitRow));
}

export async function deleteOutfit(id: string): Promise<boolean> {
  try {
    await prisma.outfit.delete({ where: { id: id.trim() } });
    return true;
  } catch {
    return false;
  }
}

export async function clearOutfits(): Promise<void> {
  await prisma.outfit.deleteMany();
}

export async function saveOutfitFeedback(
  feedback: OutfitFeedbackInput,
): Promise<SavedOutfit | null> {
  const outfit = await getOutfitById(feedback.outfitId);
  if (!outfit || outfit.userId !== feedback.userId.trim()) return null;

  const tags = feedback.tags?.map((t) => t.trim()).filter(Boolean);
  const occasion = feedback.occasion?.trim() || outfit.occasion;

  const updated = await prisma.outfit.update({
    where: { id: outfit.id },
    data: {
      feedback: feedback.action,
      feedbackTags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
      occasion: occasion ?? null,
    },
  });

  return rowToOutfit(updated as PrismaOutfitRow);
}
