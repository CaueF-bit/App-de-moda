import { clearOutfits } from "../db/outfit.repository";
import { clearPreferenceWeights } from "../db/preference.repository";
import { clearUserProfiles, saveUserProfile } from "../db/userProfile.repository";
import { clearWardrobeItems, saveWardrobeItem } from "../db/wardrobe.repository";
import { clearUsers } from "../db/user.repository";
import { prisma } from "../db/prisma";
import { hashPassword } from "../services/authService";
import { OutfitFeedbackAction, UserProfile, WardrobeItem, WeatherType } from "../types/fashion";

export const DEFAULT_SEED_USER_ID = "demo-user-1";
export const DEFAULT_SEED_EMAIL = "demo@app-de-moda.dev";
export const DEFAULT_SEED_PASSWORD = "demo12345";

const seedProfile: UserProfile = {
  userId: DEFAULT_SEED_USER_ID,
  bodyType: "trapezio",
  measurements: {
    heightCm: 182,
    weightKg: 79,
    shoulderCm: 48,
    chestCm: 102,
    waistCm: 84,
    hipCm: 98,
    inseamCm: 81,
  },
  preferredFits: ["regular", "tailored"],
  personalPalette: {
    primaryColors: ["preto", "branco", "marinho", "cinza"],
    secondaryColors: ["bege", "grafite", "azul medio"],
    avoidColors: ["verde lima", "rosa choque"],
    contrastLevel: "medio",
    undertone: "neutro",
  },
  dislikedPatterns: ["animal print"],
  favoriteCategories: ["camisa", "blazer", "tenis"],
  fragrancePreferences: ["amadeirado", "citrico"],
  budgetLimit: 350,
};

const seedWardrobe: WardrobeItem[] = [
  {
    id: "wardrobe_upper_1",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/camisa-preta.jpg",
    category: "camisa",
    layer: "upper",
    subcategory: "camisa de manga longa",
    color: "preto",
    secondaryColor: "cinza",
    pattern: "liso",
    fabric: "algodao",
    idealSeason: ["outono", "inverno"],
    fit: "regular",
    formality: "smart_casual",
    tags: ["noturno", "versatil", "minimalista"],
    confidence: 0.93,
    isConfirmed: true,
  },
  {
    id: "wardrobe_upper_2",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/camiseta-branca.jpg",
    category: "camiseta",
    layer: "upper",
    color: "branco",
    pattern: "liso",
    fabric: "algodao",
    idealSeason: ["primavera", "verao"],
    fit: "regular",
    formality: "casual",
    tags: ["versatil", "casual"],
    confidence: 0.88,
    isConfirmed: true,
  },
  {
    id: "wardrobe_lower_1",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/calca-grafite.jpg",
    category: "calca",
    layer: "lower",
    color: "grafite",
    pattern: "liso",
    fabric: "sarja",
    idealSeason: ["outono", "inverno", "primavera"],
    fit: "tailored",
    formality: "smart_casual",
    tags: ["versatil", "classico"],
    confidence: 0.91,
    isConfirmed: true,
  },
  {
    id: "wardrobe_lower_2",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/bermuda-bege.jpg",
    category: "bermuda",
    layer: "lower",
    color: "bege",
    pattern: "liso",
    fabric: "linho",
    idealSeason: ["verao", "primavera"],
    fit: "regular",
    formality: "casual",
    tags: ["leve", "versatil", "casual"],
    confidence: 0.86,
    isConfirmed: true,
  },
  {
    id: "wardrobe_layer_1",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/blazer-marinho.jpg",
    category: "blazer",
    layer: "outerwear",
    color: "marinho",
    pattern: "liso",
    fabric: "misto",
    idealSeason: ["outono", "inverno"],
    fit: "tailored",
    formality: "social",
    tags: ["elegante", "classico"],
    confidence: 0.9,
    isConfirmed: true,
  },
  {
    id: "wardrobe_shoes_1",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/tenis-branco.jpg",
    category: "tenis",
    layer: "footwear",
    color: "branco",
    secondaryColor: "bege",
    pattern: "liso",
    fabric: "couro",
    idealSeason: ["primavera", "verao"],
    fit: "unknown",
    formality: "casual",
    tags: ["versatil", "moderno"],
    confidence: 0.89,
    isConfirmed: true,
  },
  {
    id: "wardrobe_shoes_2",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/sapato-cafe.jpg",
    category: "sapato",
    layer: "footwear",
    color: "marrom",
    pattern: "liso",
    fabric: "couro",
    idealSeason: ["outono", "inverno"],
    fit: "unknown",
    formality: "social",
    tags: ["classico", "elegante"],
    confidence: 0.87,
    isConfirmed: true,
  },
  {
    id: "wardrobe_accessory_1",
    userId: DEFAULT_SEED_USER_ID,
    imageUrl: "https://example.com/wardrobe/relogio-prata.jpg",
    category: "acessorio",
    layer: "accessory",
    color: "prata",
    pattern: "liso",
    idealSeason: ["primavera", "verao", "outono", "inverno"],
    fit: "unknown",
    formality: "smart_casual",
    tags: ["versatil", "premium"],
    confidence: 0.81,
    isConfirmed: true,
  },
];

export async function bootstrapMockData(): Promise<{
  userId: string;
  email: string;
  wardrobeCount: number;
}> {
  await resetMockData();

  // 1. Cria o User (necessário pra UserProfile via FK)
  const passwordHash = await hashPassword(DEFAULT_SEED_PASSWORD);
  await prisma.user.upsert({
    where: { id: DEFAULT_SEED_USER_ID },
    update: {
      email: DEFAULT_SEED_EMAIL,
      passwordHash,
      name: "Demo User",
    },
    create: {
      id: DEFAULT_SEED_USER_ID,
      email: DEFAULT_SEED_EMAIL,
      passwordHash,
      name: "Demo User",
    },
  });

  // 2. Cria o perfil de estilo
  await saveUserProfile(seedProfile);

  // 3. Popula o guarda-roupa
  for (const item of seedWardrobe) {
    await saveWardrobeItem(item);
  }

  return {
    userId: DEFAULT_SEED_USER_ID,
    email: DEFAULT_SEED_EMAIL,
    wardrobeCount: seedWardrobe.length,
  };
}

export async function resetMockData(): Promise<void> {
  // A ordem importa por causa das foreign keys.
  await clearOutfits();
  await clearPreferenceWeights();
  await clearWardrobeItems();
  await clearUserProfiles();
  await clearUsers();
}

export function getApiExamples(): {
  seedUserId: string;
  outfit: { userId: string; occasion: string; vibe: string; weather: WeatherType };
  feedback: {
    userId: string;
    outfitId: string;
    action: OutfitFeedbackAction;
    occasion: string;
    tags: string[];
  };
  packing: {
    userId: string;
    destination: string;
    durationDays: number;
    weather: WeatherType;
    plannedOccasions: string[];
  };
} {
  return {
    seedUserId: DEFAULT_SEED_USER_ID,
    outfit: {
      userId: DEFAULT_SEED_USER_ID,
      occasion: "jantar",
      vibe: "elegante minimalista",
      weather: "frio",
    },
    feedback: {
      userId: DEFAULT_SEED_USER_ID,
      outfitId: "substituir-pelo-outfitId-retornado",
      action: "like",
      occasion: "jantar",
      tags: ["preto", "camisa", "blazer", "elegante"],
    },
    packing: {
      userId: DEFAULT_SEED_USER_ID,
      destination: "Sao Paulo",
      durationDays: 4,
      weather: "ameno",
      plannedOccasions: ["trabalho", "jantar"],
    },
  };
}
