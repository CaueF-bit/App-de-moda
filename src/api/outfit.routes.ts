import { Router } from "express";
import { getUserProfile } from "../db/userProfile.repository";
import { listWardrobeItemsByUser } from "../db/wardrobe.repository";
import { saveOutfit } from "../db/outfit.repository";
import { generateContextualOutfit } from "../services/recommendationService";
import { suggestPurchaseForGap } from "../services/shoppingService";
import { NotFoundError } from "../errors/AppError";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { generateOutfitSchema } from "../schemas/fashion.schemas";
import {
  ClothingCategory,
  OccasionInput,
  OutfitSuggestion,
  SavedOutfit,
  ShoppingSuggestion,
} from "../types/fashion";

const SUPPORTED_CATEGORIES = new Set<ClothingCategory>([
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
]);

const router = Router();

router.post(
  "/outfit",
  validate(generateOutfitSchema),
  asyncHandler(async (req, res) => {
    const { userId, occasion, vibe, weather } = req.body;

    const profile = await getUserProfile(userId);
    if (!profile) throw new NotFoundError("Perfil do usuário não encontrado.");

    const wardrobe = await listWardrobeItemsByUser(userId);
    if (wardrobe.length === 0) {
      throw new NotFoundError("Nenhuma peça encontrada no guarda-roupa do usuário.");
    }

    const occasionInput: OccasionInput = {
      occasion,
      weather,
      ...(vibe ? { vibe } : {}),
    };

    const outfits = await generateContextualOutfit(profile, wardrobe, occasionInput);
    const enriched: Array<SavedOutfit & { shoppingSuggestions: ShoppingSuggestion[] }> = [];

    for (const outfit of outfits) {
      const saved = await persistOutfit(userId, occasion, outfit);
      const shoppingSuggestions = await buildShoppingSuggestions(
        outfit.missingItems,
        profile.budgetLimit,
        occasion,
      );
      enriched.push({ ...saved, shoppingSuggestions });
    }

    return res.status(200).json(enriched);
  }),
);

async function persistOutfit(
  userId: string,
  occasion: string,
  outfit: OutfitSuggestion,
): Promise<SavedOutfit> {
  return saveOutfit({
    id: createOutfitId(),
    userId,
    occasion,
    createdAt: new Date().toISOString(),
    title: outfit.title,
    reasoning: outfit.reasoning,
    score: outfit.score,
    ...(outfit.upper ? { upper: outfit.upper } : {}),
    ...(outfit.lower ? { lower: outfit.lower } : {}),
    ...(outfit.layer ? { layer: outfit.layer } : {}),
    ...(outfit.shoes ? { shoes: outfit.shoes } : {}),
    ...(outfit.accessories ? { accessories: outfit.accessories } : {}),
    ...(outfit.fragrance ? { fragrance: outfit.fragrance } : {}),
    ...(outfit.missingItems ? { missingItems: outfit.missingItems } : {}),
  });
}

async function buildShoppingSuggestions(
  missingItems: OutfitSuggestion["missingItems"],
  budgetLimit: number,
  occasion: string,
): Promise<ShoppingSuggestion[]> {
  if (!missingItems?.length) return [];

  const firstSupportedGap = missingItems.find((item) =>
    SUPPORTED_CATEGORIES.has(item.category as ClothingCategory),
  );

  if (!firstSupportedGap) return [];

  return suggestPurchaseForGap({
    category: firstSupportedGap.category as ClothingCategory,
    budgetLimit,
    occasion,
  });
}

function createOutfitId(): string {
  return `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default router;
