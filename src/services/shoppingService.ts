import { ClothingCategory, ShoppingSuggestion } from "../types/fashion";

export interface ShoppingSearchInput {
  category: ClothingCategory;
  budgetLimit: number;
  occasion?: string;
  preferredColors?: string[];
  excludedStores?: string[];
}

type StoreInventoryItem = ShoppingSuggestion & {
  tags?: string[];
  occasionKeywords?: string[];
  colors?: string[];
};

const mockStoreInventory: StoreInventoryItem[] = [
  {
    title: "Blazer preto slim",
    storeName: "Loja Premium Centro",
    price: 299,
    category: "blazer",
    url: "https://exemplo.com/blazer-preto",
    reason: "Bom custo-beneficio para elevar looks noturnos.",
    colors: ["preto", "grafite"],
    tags: ["alfaiataria", "noturno", "elegante"],
    occasionKeywords: ["jantar", "evento", "balada elegante", "casamento"],
  },
  {
    title: "Tenis branco couro",
    storeName: "Sneaker House",
    price: 249,
    category: "tenis",
    url: "https://exemplo.com/tenis-branco",
    reason: "Versatil e combina com propostas casuais refinadas.",
    colors: ["branco", "bege"],
    tags: ["casual", "limpo", "moderno"],
    occasionKeywords: ["trabalho", "dia a dia", "passeio", "viagem"],
  },
  {
    title: "Camisa preta estruturada",
    storeName: "Urban Tailor",
    price: 179,
    category: "camisa",
    url: "https://exemplo.com/camisa-preta",
    reason: "Boa opcao para balada elegante e jantar.",
    colors: ["preto"],
    tags: ["noturno", "minimalista", "smart"],
    occasionKeywords: ["jantar", "balada", "date", "evento"],
  },
  {
    title: "Calca de sarja areia",
    storeName: "Essential Wear",
    price: 199,
    category: "calca",
    url: "https://exemplo.com/calca-sarja-areia",
    reason: "Base neutra para looks leves de clima ameno e quente.",
    colors: ["areia", "bege", "caqui"],
    tags: ["versatil", "casual", "smart_casual"],
    occasionKeywords: ["trabalho", "almoco", "fim de semana"],
  },
  {
    title: "Jaqueta leve impermeavel",
    storeName: "Urban Tailor",
    price: 279,
    category: "jaqueta",
    url: "https://exemplo.com/jaqueta-impermeavel",
    reason: "Funciona bem para dias chuvosos sem perder estilo.",
    colors: ["marinho", "preto"],
    tags: ["funcional", "urbano", "chuvoso"],
    occasionKeywords: ["chuva", "viagem", "dia a dia"],
  },
  {
    title: "Sapato derby cafe",
    storeName: "Forma Masculina",
    price: 329,
    category: "sapato",
    url: "https://exemplo.com/sapato-derby-cafe",
    reason: "Entrega presenca social sem ficar formal demais.",
    colors: ["cafe", "marrom"],
    tags: ["social", "classico", "premium"],
    occasionKeywords: ["casamento", "trabalho", "jantar"],
  },
];

export async function suggestPurchaseForGap(
  input: ShoppingSearchInput,
): Promise<ShoppingSuggestion[]> {
  validateShoppingSearchInput(input);

  const normalizedOccasion = input.occasion?.trim().toLowerCase();
  const preferredColors = normalizeStringList(input.preferredColors);
  const excludedStores = normalizeStringList(input.excludedStores);

  return mockStoreInventory
    .filter((item) => item.category === input.category)
    .filter((item) => item.price <= input.budgetLimit)
    .filter((item) => !excludedStores || !excludedStores.includes(item.storeName.toLowerCase()))
    .map((item) => ({
      item,
      score: scoreShoppingSuggestion(item, normalizedOccasion, preferredColors, input.budgetLimit),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.item.price - b.item.price;
    })
    .map(({ item, score }) => ({
      title: item.title,
      storeName: item.storeName,
      price: item.price,
      category: item.category,
      url: item.url,
      reason: buildSuggestionReason(item, score, normalizedOccasion, preferredColors),
    }));
}

function scoreShoppingSuggestion(
  item: StoreInventoryItem,
  occasion?: string,
  preferredColors?: string[],
  budgetLimit?: number,
): number {
  let score = 0;

  if (occasion && item.occasionKeywords?.some((keyword) => occasion.includes(keyword.toLowerCase()))) {
    score += 4;
  }

  if (preferredColors && preferredColors.length > 0) {
    const itemColors = item.colors?.map((color) => color.toLowerCase()) ?? [];
    if (preferredColors.some((color) => itemColors.includes(color))) {
      score += 3;
    }
  }

  if (typeof budgetLimit === "number" && budgetLimit > 0) {
    const budgetUsage = item.price / budgetLimit;

    if (budgetUsage <= 0.6) {
      score += 3;
    } else if (budgetUsage <= 0.85) {
      score += 2;
    } else {
      score += 1;
    }
  }

  if (item.tags?.includes("versatil")) {
    score += 1;
  }

  return score;
}

function buildSuggestionReason(
  item: StoreInventoryItem,
  score: number,
  occasion?: string,
  preferredColors?: string[],
): string {
  const reasons = [item.reason];

  if (occasion && item.occasionKeywords?.some((keyword) => occasion.includes(keyword.toLowerCase()))) {
    reasons.push("Tem boa aderencia com a ocasiao informada.");
  }

  if (preferredColors && preferredColors.length > 0) {
    const itemColors = item.colors?.map((color) => color.toLowerCase()) ?? [];
    if (preferredColors.some((color) => itemColors.includes(color))) {
      reasons.push("Conversa com as cores priorizadas na busca.");
    }
  }

  if (score >= 6) {
    reasons.push("Apareceu entre as opcoes mais fortes do ranking.");
  }

  return reasons.join(" ");
}

function normalizeStringList(values?: string[]): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalizedValues = values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

function validateShoppingSearchInput(input: ShoppingSearchInput): void {
  if (input.budgetLimit <= 0) {
    throw new Error("O budgetLimit precisa ser maior que zero.");
  }
}
