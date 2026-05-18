export type ClothingCategory =
  | "camiseta"
  | "camisa"
  | "jaqueta"
  | "blazer"
  | "calca"
  | "bermuda"
  | "shorts"
  | "tenis"
  | "sapato"
  | "bota"
  | "acessorio"
  | "perfume"
  | "outro";

export type FitPreference = "slim" | "regular" | "oversized" | "tailored";
export type BodyType = "triangulo" | "triangulo_invertido" | "retangulo" | "oval" | "trapezio";
export type FormalityLevel = "casual" | "smart_casual" | "social" | "elegante";
export type WeatherType = "quente" | "ameno" | "frio" | "chuvoso";
export type SeasonType = "primavera" | "verao" | "outono" | "inverno";
export type ContrastLevel = "baixo" | "medio" | "alto";
export type Undertone = "quente" | "frio" | "neutro";
export type PatternType = "liso" | "listrado" | "xadrez" | "estampado" | "texturizado";
export type ClothingLayer = "upper" | "lower" | "outerwear" | "footwear" | "accessory" | "fragrance";
export type MaterialType =
  | "algodao"
  | "linho"
  | "jeans"
  | "la"
  | "couro"
  | "sarja"
  | "malha"
  | "poliester"
  | "suede"
  | "misto"
  | "outro";
export type StyleTag =
  | "minimalista"
  | "urbano"
  | "classico"
  | "moderno"
  | "noturno"
  | "versatil"
  | "casual"
  | "elegante"
  | "streetwear"
  | "premium";
export type ImageAnalysisStatus = "pending" | "processed" | "failed";
export type AiProvider = "mock-vision-v1" | "openai" | "custom";
export type ConfidenceLevel = number;
export type OutfitFeedbackAction = "like" | "dislike";

export interface PersonalColorPalette {
  primaryColors: string[];
  secondaryColors: string[];
  avoidColors: string[];
  contrastLevel: ContrastLevel;
  undertone?: Undertone;
}

export interface UserMeasurements {
  heightCm?: number;
  weightKg?: number;
  shoulderCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  inseamCm?: number;
}

export interface UserProfile {
  userId: string;
  bodyType: BodyType;
  measurements: UserMeasurements;
  preferredFits: FitPreference[];
  personalPalette: PersonalColorPalette;
  dislikedPatterns?: string[];
  favoriteCategories?: ClothingCategory[];
  fragrancePreferences?: string[];
  budgetLimit: number;
}

export interface ClothingAttributes {
  category: ClothingCategory;
  layer?: ClothingLayer;
  subcategory?: string;
  color: string;
  secondaryColor?: string;
  pattern?: PatternType | string;
  brand?: string;
  fabric?: MaterialType | string;
  idealSeason?: SeasonType[];
  fit?: FitPreference | "unknown";
  formality?: FormalityLevel;
  tags?: StyleTag[] | string[];
}

export interface ClothingAnalysisMetadata {
  provider: AiProvider;
  analyzedAt: string;
  imageUrl: string;
  status: ImageAnalysisStatus;
  promptVersion: string;
  processingTimeMs?: number;
  notes?: string[];
  dominantColors?: string[];
}

export interface WardrobeItem extends ClothingAttributes {
  id: string;
  userId: string;
  imageUrl: string;
  confidence?: ConfidenceLevel;
  isConfirmed: boolean;
}

export interface AnalyzedClothingResult {
  backgroundRemovedUrl: string;
  item: ClothingAttributes;
  confidence: ConfidenceLevel;
  metadata: ClothingAnalysisMetadata;
  alternatives?: ClothingAttributes[];
  warnings?: string[];
}

export interface ClothingAnalysisOptions {
  userId?: string;
  occasion?: string;
  expectedCategory?: ClothingCategory;
  includeAlternatives?: boolean;
  removeBackground?: boolean;
  provider?: AiProvider;
}

export interface OccasionInput {
  occasion: string;
  vibe?: string;
  weather: WeatherType;
  city?: string;
}

export interface FragranceSuggestion {
  family: string;
  reason: string;
}

export interface OutfitSuggestion {
  title: string;
  reasoning: string;
  upper?: WardrobeItem;
  lower?: WardrobeItem;
  layer?: WardrobeItem;
  shoes?: WardrobeItem;
  accessories?: WardrobeItem[];
  fragrance?: FragranceSuggestion;
  missingItems?: {
    category: ClothingCategory | string;
    reason: string;
  }[];
  score: number;
}

export interface SavedOutfit extends OutfitSuggestion {
  id: string;
  userId: string;
  occasion?: string;
  createdAt: string;
  feedback?: OutfitFeedbackAction;
  feedbackTags?: string[];
}

export interface ShoppingSuggestion {
  title: string;
  storeName: string;
  price: number;
  category: ClothingCategory;
  url?: string;
  reason: string;
}

export interface PackingSuggestion {
  destination: string;
  durationDays: number;
  weather: WeatherType;
  selectedItems: WardrobeItem[];
  missingItems: {
    category: ClothingCategory | string;
    reason: string;
  }[];
  notes: string[];
  summary: {
    uppers: number;
    lowers: number;
    layers: number;
    shoes: number;
    accessories: number;
  };
}

export interface OutfitFeedbackInput {
  userId: string;
  outfitId: string;
  action: OutfitFeedbackAction;
  occasion?: string;
  tags?: string[];
}
