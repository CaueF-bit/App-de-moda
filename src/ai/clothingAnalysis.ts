import {
  AnalyzedClothingResult,
  ClothingAnalysisOptions,
  ClothingAttributes,
  ClothingCategory,
} from "../types/fashion";

const DEFAULT_PROVIDER = "mock-vision-v1";
const DEFAULT_PROMPT_VERSION = "clothing-analysis-v1";

type MockCatalogEntry = {
  keywords: string[];
  item: ClothingAttributes;
  confidence: number;
  alternatives?: ClothingAttributes[];
  warnings?: string[];
};

const MOCK_CATALOG: MockCatalogEntry[] = [
  {
    keywords: ["camisa", "shirt", "social"],
    item: {
      category: "camisa",
      layer: "upper",
      subcategory: "camisa de manga longa",
      color: "preto",
      secondaryColor: "cinza",
      pattern: "liso",
      brand: "unknown",
      fabric: "algodao",
      idealSeason: ["outono", "inverno"],
      fit: "regular",
      formality: "smart_casual",
      tags: ["noturno", "versatil", "minimalista"],
    },
    confidence: 0.86,
    alternatives: [
      {
        category: "blazer",
        layer: "outerwear",
        subcategory: "blazer estruturado",
        color: "grafite",
        pattern: "liso",
        fabric: "misto",
        idealSeason: ["outono", "inverno"],
        fit: "tailored",
        formality: "social",
        tags: ["classico", "elegante"],
      },
    ],
  },
  {
    keywords: ["jaqueta", "jacket", "couro"],
    item: {
      category: "jaqueta",
      layer: "outerwear",
      subcategory: "jaqueta biker",
      color: "preto",
      pattern: "liso",
      fabric: "couro",
      idealSeason: ["outono", "inverno"],
      fit: "regular",
      formality: "casual",
      tags: ["urbano", "moderno", "noturno"],
    },
    confidence: 0.88,
    alternatives: [
      {
        category: "blazer",
        layer: "outerwear",
        subcategory: "blazer casual",
        color: "marinho",
        pattern: "liso",
        fabric: "sarja",
        idealSeason: ["outono", "primavera"],
        fit: "tailored",
        formality: "smart_casual",
        tags: ["classico", "versatil"],
      },
    ],
  },
  {
    keywords: ["tenis", "sneaker", "shoe"],
    item: {
      category: "tenis",
      layer: "footwear",
      subcategory: "tenis casual",
      color: "branco",
      secondaryColor: "bege",
      pattern: "liso",
      fabric: "couro",
      idealSeason: ["primavera", "verao"],
      fit: "unknown",
      formality: "casual",
      tags: ["versatil", "moderno", "casual"],
    },
    confidence: 0.84,
    warnings: ["Calcados claros costumam exigir verificacao manual de sujeira e desgaste."],
  },
  {
    keywords: ["calca", "pants", "jeans", "denim"],
    item: {
      category: "calca",
      layer: "lower",
      subcategory: "calca reta",
      color: "azul medio",
      pattern: "liso",
      fabric: "jeans",
      idealSeason: ["outono", "inverno", "primavera"],
      fit: "regular",
      formality: "casual",
      tags: ["versatil", "urbano", "casual"],
    },
    confidence: 0.83,
  },
];

export async function mockBackgroundRemoval(imageUrl: string): Promise<string> {
  const normalizedUrl = imageUrl.trim();
  const separator = normalizedUrl.includes("?") ? "&" : "?";
  return `${normalizedUrl}${separator}bg_removed=true`;
}

export async function analyzeClothingImage(
  imageUrl: string,
  options: ClothingAnalysisOptions = {},
): Promise<AnalyzedClothingResult> {
  const startedAt = Date.now();
  const normalizedUrl = validateImageUrl(imageUrl);
  const catalogEntry = resolveMockCatalogEntry(normalizedUrl, options.expectedCategory);
  const backgroundRemovedUrl = options.removeBackground === false
    ? normalizedUrl
    : await mockBackgroundRemoval(normalizedUrl);
  const warnings = buildWarnings(options, catalogEntry.warnings);
  const confidence = applyConfidenceAdjustments(catalogEntry.confidence, warnings);

  return {
    backgroundRemovedUrl,
    item: {
      ...catalogEntry.item,
      category: options.expectedCategory ?? catalogEntry.item.category,
    },
    confidence,
    metadata: {
      provider: options.provider ?? DEFAULT_PROVIDER,
      analyzedAt: new Date().toISOString(),
      imageUrl: normalizedUrl,
      status: "processed",
      promptVersion: DEFAULT_PROMPT_VERSION,
      processingTimeMs: Date.now() - startedAt,
      dominantColors: compactColors(catalogEntry.item.color, catalogEntry.item.secondaryColor),
      notes: buildMetadataNotes(options),
    },
    alternatives: options.includeAlternatives ? catalogEntry.alternatives : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function validateImageUrl(imageUrl: string): string {
  const normalizedUrl = imageUrl.trim();

  if (!normalizedUrl) {
    throw new Error("A URL da imagem e obrigatoria para analisar a roupa.");
  }

  if (!/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error("A URL da imagem precisa comecar com http:// ou https://.");
  }

  return normalizedUrl;
}

function resolveMockCatalogEntry(
  imageUrl: string,
  expectedCategory?: ClothingCategory,
): MockCatalogEntry {
  if (expectedCategory) {
    const categoryMatch = MOCK_CATALOG.find((entry) => entry.item.category === expectedCategory);
    if (categoryMatch) {
      return categoryMatch;
    }
  }

  const normalizedSource = imageUrl.toLowerCase();
  const matchedEntry = MOCK_CATALOG.find((entry) =>
    entry.keywords.some((keyword) => normalizedSource.includes(keyword)),
  );

  return matchedEntry ?? MOCK_CATALOG[0];
}

function buildWarnings(options: ClothingAnalysisOptions, catalogWarnings: string[] = []): string[] {
  const warnings = [...catalogWarnings];

  if (!options.removeBackground) {
    warnings.push("A remocao de fundo foi desativada; isso pode reduzir a precisao visual.");
  }

  if (options.expectedCategory && options.expectedCategory === "perfume") {
    warnings.push("A categoria perfume depende mais do contexto do produto do que do tecido ou caimento.");
  }

  return warnings;
}

function applyConfidenceAdjustments(baseConfidence: number, warnings: string[]): number {
  const adjusted = warnings.length > 0 ? baseConfidence - warnings.length * 0.03 : baseConfidence;
  return Math.max(0.5, Number(adjusted.toFixed(2)));
}

function compactColors(primaryColor: string, secondaryColor?: string): string[] {
  return [primaryColor, secondaryColor].filter((value): value is string => Boolean(value));
}

function buildMetadataNotes(options: ClothingAnalysisOptions): string[] {
  const notes: string[] = ["Resultado gerado por catalogo mock deterministico para MVP."];

  if (options.userId) {
    notes.push(`Analise vinculada ao usuario ${options.userId}.`);
  }

  if (options.occasion) {
    notes.push(`Contexto de uso considerado: ${options.occasion}.`);
  }

  if (options.expectedCategory) {
    notes.push(`Categoria priorizada na classificacao: ${options.expectedCategory}.`);
  }

  return notes;
}
