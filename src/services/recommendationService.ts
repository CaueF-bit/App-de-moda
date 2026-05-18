import { generateOutfitWithAi, isAiAvailable } from "../ai/claudeClient";
import { logger } from "../config/logger";
import {
  ClothingCategory,
  FormalityLevel,
  OccasionInput,
  OutfitSuggestion,
  SeasonType,
  UserProfile,
  WardrobeItem,
} from "../types/fashion";

const UPPER_CATEGORIES: ClothingCategory[] = ["camiseta", "camisa", "blazer", "jaqueta"];
const LOWER_CATEGORIES: ClothingCategory[] = ["calca", "bermuda", "shorts"];
const SHOE_CATEGORIES: ClothingCategory[] = ["tenis", "sapato", "bota"];

function weatherToSeasons(weather: OccasionInput["weather"]): SeasonType[] {
  switch (weather) {
    case "quente":
      return ["verao", "primavera"];
    case "ameno":
      return ["primavera", "outono"];
    case "frio":
      return ["inverno", "outono"];
    case "chuvoso":
      return ["outono", "inverno", "primavera"];
    default:
      return ["primavera", "verao", "outono", "inverno"];
  }
}

function matchesWeather(item: WardrobeItem, weather: OccasionInput["weather"]): boolean {
  if (!item.idealSeason || item.idealSeason.length === 0) {
    return true;
  }

  const compatibleSeasons = weatherToSeasons(weather);
  return item.idealSeason.some((season) => compatibleSeasons.includes(season));
}

function matchesPalette(item: WardrobeItem, profile: UserProfile): boolean {
  const allowed = [
    ...profile.personalPalette.primaryColors,
    ...profile.personalPalette.secondaryColors,
  ].map((color) => color.toLowerCase());

  const avoid = profile.personalPalette.avoidColors.map((color) => color.toLowerCase());
  const primary = item.color.toLowerCase();
  const secondary = item.secondaryColor?.toLowerCase();

  if (avoid.includes(primary) || (secondary && avoid.includes(secondary))) {
    return false;
  }

  return allowed.includes(primary) || (secondary ? allowed.includes(secondary) : false);
}

function matchesFit(item: WardrobeItem, profile: UserProfile): boolean {
  if (!item.fit || item.fit === "unknown") {
    return true;
  }

  return profile.preferredFits.includes(item.fit);
}

function occasionFormality(occasion: string): FormalityLevel {
  const text = occasion.toLowerCase();

  if (text.includes("balada elegante")) return "elegante";
  if (text.includes("casamento")) return "social";
  if (text.includes("jantar")) return "smart_casual";
  return "casual";
}

function scoreItem(item: WardrobeItem, profile: UserProfile, occasion: OccasionInput): number {
  let score = 0;

  if (matchesWeather(item, occasion.weather)) score += 3;
  if (matchesPalette(item, profile)) score += 3;
  if (matchesFit(item, profile)) score += 2;
  if (item.formality === occasionFormality(occasion.occasion)) score += 4;
  if (item.confidence && item.confidence > 0.8) score += 1;
  if (item.isConfirmed) score += 2;

  return score;
}

function fragranceForOccasion(occasion: string): { family: string; reason: string } {
  const text = occasion.toLowerCase();

  if (text.includes("balada")) {
    return {
      family: "amadeirado oriental",
      reason: "Combina com noite, presenca e projecao mais marcante.",
    };
  }

  if (text.includes("trabalho")) {
    return {
      family: "citrico amadeirado",
      reason: "Passa limpeza, confianca e versatilidade.",
    };
  }

  return {
    family: "aromatico versatil",
    reason: "Equilibra frescor e elegancia para diferentes contextos.",
  };
}

function rankItems(
  items: WardrobeItem[],
  profile: UserProfile,
  occasion: OccasionInput,
): Array<{ item: WardrobeItem; score: number }> {
  return items
    .map((item) => ({ item, score: scoreItem(item, profile, occasion) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Gera sugestões de outfit.
 *
 * Estratégia:
 *  1. Se IA estiver habilitada (ANTHROPIC_API_KEY + AI_ENABLED=true), tenta Claude.
 *  2. Em qualquer falha (timeout, JSON quebrado, sem conexão), cai no heurístico.
 *  3. Sem IA, usa direto o heurístico — útil em CI, dev local, modo barato.
 */
export async function generateContextualOutfit(
  profile: UserProfile,
  wardrobe: WardrobeItem[],
  occasion: OccasionInput,
): Promise<OutfitSuggestion[]> {
  if (isAiAvailable()) {
    try {
      const aiSuggestion = await generateOutfitWithAi(profile, wardrobe, occasion);
      return [aiSuggestion];
    } catch (err) {
      logger.warn({ err }, "Falha na IA — usando recomendador heurístico como fallback");
    }
  }

  return generateHeuristicOutfit(profile, wardrobe, occasion);
}

async function generateHeuristicOutfit(
  profile: UserProfile,
  wardrobe: WardrobeItem[],
  occasion: OccasionInput,
): Promise<OutfitSuggestion[]> {
  const confirmedItems = wardrobe.filter((item) => item.isConfirmed);

  const uppers = confirmedItems.filter((item) => UPPER_CATEGORIES.includes(item.category));
  const lowers = confirmedItems.filter((item) => LOWER_CATEGORIES.includes(item.category));
  const shoes = confirmedItems.filter((item) => SHOE_CATEGORIES.includes(item.category));

  const scoredUppers = rankItems(uppers, profile, occasion);
  const scoredLowers = rankItems(lowers, profile, occasion);
  const scoredShoes = rankItems(shoes, profile, occasion);

  const bestUpper = scoredUppers[0]?.item;
  const bestLower = scoredLowers[0]?.item;
  const bestShoes = scoredShoes[0]?.item;

  const missingItems: { category: string; reason: string }[] = [];

  if (!bestUpper) {
    missingItems.push({
      category: "parte de cima",
      reason: "Falta uma peca adequada para a ocasiao.",
    });
  }

  if (!bestLower) {
    missingItems.push({
      category: "parte de baixo",
      reason: "Falta uma base coerente para o look.",
    });
  }

  if (!bestShoes) {
    missingItems.push({
      category: "calcado",
      reason: "Falta um calcado compativel com a proposta.",
    });
  }

  const fragrance = fragranceForOccasion(occasion.occasion);

  const suggestion: OutfitSuggestion = {
    title: `Look para ${occasion.occasion}`,
    reasoning:
      "Este look foi montado cruzando ocasiao, clima, idealSeason, paleta pessoal e preferencias de caimento do usuario.",
    upper: bestUpper,
    lower: bestLower,
    shoes: bestShoes,
    fragrance,
    missingItems,
    score:
      (scoredUppers[0]?.score ?? 0) +
      (scoredLowers[0]?.score ?? 0) +
      (scoredShoes[0]?.score ?? 0),
  };

  return [suggestion];
}
