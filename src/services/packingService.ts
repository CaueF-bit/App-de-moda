import {
  ClothingCategory,
  PackingSuggestion,
  SeasonType,
  UserProfile,
  WardrobeItem,
  WeatherType,
} from "../types/fashion";

export interface PackingInput {
  destination: string;
  durationDays: number;
  weather: WeatherType;
  wardrobe: WardrobeItem[];
  profile: UserProfile;
  plannedOccasions?: string[];
}

const UPPER_CATEGORIES: ClothingCategory[] = ["camiseta", "camisa"];
const LOWER_CATEGORIES: ClothingCategory[] = ["calca", "bermuda", "shorts"];
const LAYER_CATEGORIES: ClothingCategory[] = ["jaqueta", "blazer"];
const SHOE_CATEGORIES: ClothingCategory[] = ["tenis", "sapato", "bota"];
const ACCESSORY_CATEGORIES: ClothingCategory[] = ["acessorio", "perfume"];

export async function generateSmartPackingList(
  input: PackingInput,
): Promise<PackingSuggestion> {
  validatePackingInput(input);

  const confirmedItems = input.wardrobe.filter((item) => item.isConfirmed);
  const compatibleSeasons = weatherToSeasons(input.weather);

  const uppers = rankPackingItems(
    confirmedItems.filter((item) => UPPER_CATEGORIES.includes(item.category)),
    input.profile,
    compatibleSeasons,
    input.weather,
  );
  const lowers = rankPackingItems(
    confirmedItems.filter((item) => LOWER_CATEGORIES.includes(item.category)),
    input.profile,
    compatibleSeasons,
    input.weather,
  );
  const layers = rankPackingItems(
    confirmedItems.filter((item) => LAYER_CATEGORIES.includes(item.category)),
    input.profile,
    compatibleSeasons,
    input.weather,
  );
  const shoes = rankPackingItems(
    confirmedItems.filter((item) => SHOE_CATEGORIES.includes(item.category)),
    input.profile,
    compatibleSeasons,
    input.weather,
  );
  const accessories = rankPackingItems(
    confirmedItems.filter((item) => ACCESSORY_CATEGORIES.includes(item.category)),
    input.profile,
    compatibleSeasons,
    input.weather,
  );

  const targets = getPackingTargets(input.durationDays, input.weather);
  const selectedItems = dedupeItems([
    ...pickTopItems(uppers, targets.uppers),
    ...pickTopItems(lowers, targets.lowers),
    ...pickTopItems(layers, targets.layers),
    ...pickTopItems(shoes, targets.shoes),
    ...pickTopItems(accessories, targets.accessories),
  ]);

  return {
    destination: input.destination.trim(),
    durationDays: input.durationDays,
    weather: input.weather,
    selectedItems,
    missingItems: buildMissingItems(
      { uppers, lowers, layers, shoes, accessories },
      targets,
      input.weather,
    ),
    notes: buildPackingNotes(input, compatibleSeasons, selectedItems.length),
    summary: {
      uppers: countSelectedByCategories(selectedItems, UPPER_CATEGORIES),
      lowers: countSelectedByCategories(selectedItems, LOWER_CATEGORIES),
      layers: countSelectedByCategories(selectedItems, LAYER_CATEGORIES),
      shoes: countSelectedByCategories(selectedItems, SHOE_CATEGORIES),
      accessories: countSelectedByCategories(selectedItems, ACCESSORY_CATEGORIES),
    },
  };
}

function rankPackingItems(
  items: WardrobeItem[],
  profile: UserProfile,
  compatibleSeasons: SeasonType[],
  weather: WeatherType,
): WardrobeItem[] {
  return [...items].sort((left, right) => {
    const rightScore = scorePackingItem(right, profile, compatibleSeasons, weather);
    const leftScore = scorePackingItem(left, profile, compatibleSeasons, weather);
    return rightScore - leftScore;
  });
}

function scorePackingItem(
  item: WardrobeItem,
  profile: UserProfile,
  compatibleSeasons: SeasonType[],
  weather: WeatherType,
): number {
  let score = 0;

  if (!item.idealSeason || item.idealSeason.some((season) => compatibleSeasons.includes(season))) {
    score += 4;
  }

  if (item.fit && item.fit !== "unknown" && profile.preferredFits.includes(item.fit)) {
    score += 2;
  }

  const profileColors = [
    ...profile.personalPalette.primaryColors,
    ...profile.personalPalette.secondaryColors,
  ].map((color) => color.toLowerCase());

  const avoidColors = profile.personalPalette.avoidColors.map((color) => color.toLowerCase());
  const itemColors = [item.color, item.secondaryColor]
    .filter(Boolean)
    .map((color) => color!.toLowerCase());

  if (itemColors.some((color) => avoidColors.includes(color))) {
    score -= 4;
  }

  if (itemColors.some((color) => profileColors.includes(color))) {
    score += 2;
  }

  if (item.confidence && item.confidence >= 0.8) {
    score += 1;
  }

  if (item.tags?.includes("versatil")) {
    score += 2;
  }

  if ((weather === "frio" || weather === "chuvoso") && item.category === "jaqueta") {
    score += 2;
  }

  if (weather === "quente" && (item.category === "bermuda" || item.category === "shorts")) {
    score += 2;
  }

  return score;
}

function weatherToSeasons(weather: WeatherType): SeasonType[] {
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

function getPackingTargets(durationDays: number, weather: WeatherType) {
  const upperBase = Math.min(Math.max(Math.ceil(durationDays / 2) + 1, 2), 6);
  const lowerBase = Math.min(Math.max(Math.ceil(durationDays / 3) + 1, 2), 4);
  const layerBase = weather === "frio" || weather === "chuvoso" ? 2 : weather === "ameno" ? 1 : 0;
  const shoeBase = durationDays >= 4 ? 2 : 1;
  const accessoryBase = durationDays >= 3 ? 2 : 1;

  return {
    uppers: upperBase,
    lowers: lowerBase,
    layers: layerBase,
    shoes: shoeBase,
    accessories: accessoryBase,
  };
}

function pickTopItems(items: WardrobeItem[], count: number): WardrobeItem[] {
  if (count <= 0) {
    return [];
  }

  return items.slice(0, count);
}

function dedupeItems(items: WardrobeItem[]): WardrobeItem[] {
  const uniqueItems = new Map<string, WardrobeItem>();

  for (const item of items) {
    uniqueItems.set(item.id, item);
  }

  return Array.from(uniqueItems.values());
}

function buildMissingItems(
  groupedItems: {
    uppers: WardrobeItem[];
    lowers: WardrobeItem[];
    layers: WardrobeItem[];
    shoes: WardrobeItem[];
    accessories: WardrobeItem[];
  },
  targets: { uppers: number; lowers: number; layers: number; shoes: number; accessories: number },
  weather: WeatherType,
): PackingSuggestion["missingItems"] {
  const missingItems: PackingSuggestion["missingItems"] = [];

  if (groupedItems.uppers.length < targets.uppers) {
    missingItems.push({
      category: "camiseta",
      reason: "Faltam pecas de parte de cima para sustentar a rotacao da viagem.",
    });
  }

  if (groupedItems.lowers.length < targets.lowers) {
    missingItems.push({
      category: "calca",
      reason: "A base de partes de baixo esta curta para os dias planejados.",
    });
  }

  if (targets.layers > 0 && groupedItems.layers.length < targets.layers) {
    missingItems.push({
      category: "jaqueta",
      reason: "O clima pede camada extra e o guarda-roupa atual nao cobre isso direito.",
    });
  }

  if (groupedItems.shoes.length < targets.shoes) {
    missingItems.push({
      category: weather === "chuvoso" ? "bota" : "tenis",
      reason: "Vale ter mais opcao de calcado para conforto e variacao.",
    });
  }

  if (groupedItems.accessories.length < targets.accessories) {
    missingItems.push({
      category: "acessorio",
      reason: "Faltam complementos para variar os looks com pouco volume na mala.",
    });
  }

  return missingItems;
}

function buildPackingNotes(
  input: PackingInput,
  compatibleSeasons: SeasonType[],
  selectedCount: number,
): string[] {
  const notes = [
    `Mala pensada para ${input.durationDays} dias em ${input.destination.trim()}.`,
    `Clima principal: ${input.weather}. Estacoes priorizadas: ${compatibleSeasons.join(", ")}.`,
    `Foram selecionadas ${selectedCount} pecas confirmadas do guarda-roupa.`,
  ];

  if (input.plannedOccasions && input.plannedOccasions.length > 0) {
    notes.push(`Ocasioes consideradas: ${input.plannedOccasions.join(", ")}.`);
  }

  if (input.weather === "chuvoso") {
    notes.push("Priorize tecido de secagem rapida e ao menos uma camada protetora.");
  }

  if (input.weather === "quente") {
    notes.push("A selecao favorece pecas leves e mais respiraveis para rotacao facil.");
  }

  return notes;
}

function countSelectedByCategories(
  items: WardrobeItem[],
  categories: ClothingCategory[],
): number {
  return items.filter((item) => categories.includes(item.category)).length;
}

function validatePackingInput(input: PackingInput): void {
  if (!input.destination.trim()) {
    throw new Error("O destino e obrigatorio para montar a mala.");
  }

  if (input.durationDays <= 0) {
    throw new Error("A viagem precisa ter pelo menos 1 dia.");
  }
}
