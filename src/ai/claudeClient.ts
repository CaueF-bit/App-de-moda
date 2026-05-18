import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ExternalServiceError } from "../errors/AppError";
import {
  OccasionInput,
  OutfitSuggestion,
  UserProfile,
  WardrobeItem,
} from "../types/fashion";

/**
 * Cliente Claude (Anthropic).
 *
 * Estratégia: se ANTHROPIC_API_KEY estiver vazia ou AI_ENABLED=false,
 * `isAiAvailable()` retorna false — a aplicação cai no recomendador
 * heurístico (sem IA) sem quebrar. Isso vale para CI, testes e dev local.
 */

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

export function isAiAvailable(): boolean {
  return env.AI_ENABLED && env.ANTHROPIC_API_KEY.length > 0;
}

interface AiOutfitResponse {
  title: string;
  reasoning: string;
  score: number;
  upperItemId?: string;
  lowerItemId?: string;
  layerItemId?: string;
  shoesItemId?: string;
  accessoryItemIds?: string[];
  fragranceFamily?: string;
  fragranceReason?: string;
  missingItems?: { category: string; reason: string }[];
}

const SYSTEM_PROMPT = `Você é um stylist pessoal. A partir do perfil do usuário, do guarda-roupa disponível
e da ocasião, escolha as peças que formam o melhor look possível e justifique brevemente.

Regras:
- Use apenas peças que estão no guarda-roupa fornecido (pelos IDs).
- Considere clima, ocasião, paleta pessoal e dislikes do usuário.
- Se faltar alguma categoria essencial pro look, liste em "missingItems".
- Responda EXCLUSIVAMENTE com um JSON válido no schema solicitado, sem markdown.
- "score" é um número entre 0 e 1 indicando sua confiança no look.`;

function buildUserPrompt(
  profile: UserProfile,
  wardrobe: WardrobeItem[],
  occasion: OccasionInput,
): string {
  return JSON.stringify(
    {
      task: "gerar_outfit",
      profile: {
        bodyType: profile.bodyType,
        preferredFits: profile.preferredFits,
        personalPalette: profile.personalPalette,
        dislikedPatterns: profile.dislikedPatterns,
        favoriteCategories: profile.favoriteCategories,
        budgetLimit: profile.budgetLimit,
      },
      occasion,
      wardrobe: wardrobe.map((item) => ({
        id: item.id,
        category: item.category,
        layer: item.layer,
        color: item.color,
        secondaryColor: item.secondaryColor,
        pattern: item.pattern,
        fabric: item.fabric,
        idealSeason: item.idealSeason,
        fit: item.fit,
        formality: item.formality,
        tags: item.tags,
      })),
      output_schema: {
        title: "string curto",
        reasoning: "string em pt-BR explicando o look",
        score: "número 0..1",
        upperItemId: "id ou null",
        lowerItemId: "id ou null",
        layerItemId: "id ou null",
        shoesItemId: "id ou null",
        accessoryItemIds: "array de ids ou null",
        fragranceFamily: "string ou null",
        fragranceReason: "string ou null",
        missingItems: "array de {category, reason} ou null",
      },
    },
    null,
    2,
  );
}

function extractJson(text: string): unknown {
  // Tenta primeiro como JSON puro
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Cai pra extrair de dentro de ```json ... ```
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error("Resposta da IA não é JSON válido");
  }
}

export async function generateOutfitWithAi(
  profile: UserProfile,
  wardrobe: WardrobeItem[],
  occasion: OccasionInput,
): Promise<OutfitSuggestion> {
  if (!isAiAvailable()) {
    throw new ExternalServiceError("IA não configurada (defina ANTHROPIC_API_KEY e AI_ENABLED=true).");
  }

  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]));

  try {
    const response = await getClient().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(profile, wardrobe, occasion),
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta da IA sem conteúdo de texto");
    }

    const parsed = extractJson(textBlock.text) as AiOutfitResponse;

    const suggestion: OutfitSuggestion = {
      title: parsed.title || "Look sugerido",
      reasoning: parsed.reasoning || "",
      score: typeof parsed.score === "number" ? Math.max(0, Math.min(1, parsed.score)) : 0.7,
    };

    if (parsed.upperItemId && wardrobeById.has(parsed.upperItemId)) {
      suggestion.upper = wardrobeById.get(parsed.upperItemId);
    }
    if (parsed.lowerItemId && wardrobeById.has(parsed.lowerItemId)) {
      suggestion.lower = wardrobeById.get(parsed.lowerItemId);
    }
    if (parsed.layerItemId && wardrobeById.has(parsed.layerItemId)) {
      suggestion.layer = wardrobeById.get(parsed.layerItemId);
    }
    if (parsed.shoesItemId && wardrobeById.has(parsed.shoesItemId)) {
      suggestion.shoes = wardrobeById.get(parsed.shoesItemId);
    }
    if (parsed.accessoryItemIds?.length) {
      const accessories = parsed.accessoryItemIds
        .map((id) => wardrobeById.get(id))
        .filter((item): item is WardrobeItem => Boolean(item));
      if (accessories.length > 0) {
        suggestion.accessories = accessories;
      }
    }
    if (parsed.fragranceFamily) {
      suggestion.fragrance = {
        family: parsed.fragranceFamily,
        reason: parsed.fragranceReason || "Combinação coerente com a ocasião.",
      };
    }
    if (parsed.missingItems?.length) {
      suggestion.missingItems = parsed.missingItems;
    }

    logger.info(
      { tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens },
      "Outfit gerado por Claude",
    );

    return suggestion;
  } catch (err) {
    logger.error({ err }, "Falha ao chamar Claude");
    throw new ExternalServiceError(
      "Não foi possível gerar o look com IA agora.",
      err instanceof Error ? err.message : undefined,
    );
  }
}
