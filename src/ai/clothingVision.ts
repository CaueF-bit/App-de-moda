import { env } from "../config/env";
import { logger } from "../config/logger";
import { ExternalServiceError } from "../errors/AppError";
import { getAnthropicClient, isAiAvailable } from "./claudeClient";
import { ClothingAttributes, ClothingCategory } from "../types/fashion";

/**
 * Análise de roupa por visão computacional (Claude).
 *
 * Recebe a foto da peça (imagem base64) e devolve os atributos
 * estruturados — categoria, cor, tecido, caimento, etc. Só funciona quando
 * a IA está configurada (ANTHROPIC_API_KEY + AI_ENABLED=true); caso
 * contrário `isAiAvailable()` é false e o chamador cai no preenchimento manual.
 */

type SupportedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const VALID_CATEGORIES: ClothingCategory[] = [
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

export interface ClothingVisionResult {
  item: ClothingAttributes;
  confidence: number;
  warnings?: string[];
}

const SYSTEM_PROMPT = `Você é um especialista em moda que analisa fotos de peças de roupa.
Olhe a imagem e descreva a peça de forma estruturada, em português do Brasil.
Responda EXCLUSIVAMENTE com um JSON válido, sem markdown e sem comentários.`;

const USER_PROMPT = `Analise a peça de roupa nesta foto e responda com este JSON:
{
  "category": "uma de: camiseta, camisa, jaqueta, blazer, calca, bermuda, shorts, tenis, sapato, bota, acessorio, perfume, outro",
  "subcategory": "descrição curta em pt-BR, ex: 'camisa de linho manga longa'",
  "color": "cor predominante em pt-BR, uma palavra simples (ex: preto, branco, bege, azul, marinho, verde)",
  "secondaryColor": "cor secundária em pt-BR ou null",
  "pattern": "uma de: liso, listrado, xadrez, estampado, texturizado",
  "fabric": "uma de: algodao, linho, jeans, la, couro, sarja, malha, poliester, suede, misto, outro",
  "fit": "uma de: slim, regular, oversized, tailored",
  "formality": "uma de: casual, smart_casual, social, elegante",
  "idealSeason": ["estações ideais entre: primavera, verao, outono, inverno"],
  "tags": ["até 3 tags de estilo entre: minimalista, urbano, classico, moderno, noturno, versatil, casual, elegante, streetwear, premium"],
  "confidence": "número entre 0 e 1 indicando sua certeza na análise"
}
Se não houver roupa visível na foto, use category "outro" e confidence baixo.`;

/**
 * Analisa a foto de uma peça e devolve os atributos estruturados.
 * `base64Data` deve ser o conteúdo da imagem SEM o prefixo `data:...;base64,`.
 */
export async function analyzeClothingPhoto(
  mediaType: string,
  base64Data: string,
): Promise<ClothingVisionResult> {
  if (!isAiAvailable()) {
    throw new ExternalServiceError(
      "IA de visão não configurada (defina ANTHROPIC_API_KEY e AI_ENABLED=true).",
    );
  }

  try {
    const response = await getAnthropicClient().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as SupportedMediaType,
                data: base64Data,
              },
            },
            { type: "text", text: USER_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta da IA sem conteúdo de texto.");
    }

    logger.info(
      { tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens },
      "Foto de roupa analisada por Claude",
    );

    return normalizeVisionResult(extractJson(textBlock.text));
  } catch (err) {
    logger.error({ err }, "Falha ao analisar foto com Claude");
    throw new ExternalServiceError(
      "Não foi possível analisar a foto com IA agora.",
      err instanceof Error ? err.message : undefined,
    );
  }
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error("Resposta da IA não é JSON válido.");
  }
}

/** Sanitiza e valida a resposta crua da IA contra o domínio do app. */
function normalizeVisionResult(raw: Record<string, unknown>): ClothingVisionResult {
  const lowerStr = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined;

  const category: ClothingCategory = VALID_CATEGORIES.includes(
    String(raw.category) as ClothingCategory,
  )
    ? (String(raw.category) as ClothingCategory)
    : "outro";

  const item: ClothingAttributes = {
    category,
    color: lowerStr(raw.color) ?? "indefinida",
  };

  const subcategory =
    typeof raw.subcategory === "string" && raw.subcategory.trim()
      ? raw.subcategory.trim()
      : undefined;
  if (subcategory) item.subcategory = subcategory;

  const secondaryColor = lowerStr(raw.secondaryColor);
  if (secondaryColor) item.secondaryColor = secondaryColor;

  const pattern = lowerStr(raw.pattern);
  if (pattern) item.pattern = pattern;

  const fabric = lowerStr(raw.fabric);
  if (fabric) item.fabric = fabric;

  const fit = lowerStr(raw.fit);
  if (fit) item.fit = fit as ClothingAttributes["fit"];

  const formality = lowerStr(raw.formality);
  if (formality) item.formality = formality as ClothingAttributes["formality"];

  if (Array.isArray(raw.idealSeason)) {
    const seasons = raw.idealSeason.filter((s): s is string => typeof s === "string");
    if (seasons.length > 0) item.idealSeason = seasons as ClothingAttributes["idealSeason"];
  }

  if (Array.isArray(raw.tags)) {
    const tags = raw.tags.filter((t): t is string => typeof t === "string");
    if (tags.length > 0) item.tags = tags;
  }

  const confidence =
    typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.7;

  return { item, confidence };
}

// ===========================================================================
//  Detecção do tipo de corpo por foto
// ===========================================================================

const VALID_BODY_TYPES = [
  "triangulo",
  "triangulo_invertido",
  "retangulo",
  "oval",
  "trapezio",
] as const;

export type BodyTypeGuess = (typeof VALID_BODY_TYPES)[number];

export interface BodyTypeResult {
  bodyType: BodyTypeGuess | null;
  explanation: string;
  confidence: number;
}

const BODY_SYSTEM_PROMPT = `Você é um consultor de imagem e styling. A partir de uma foto,
classifique o formato corporal da pessoa em uma das 5 categorias usadas em moda, com o
único objetivo de recomendar roupas. Seja respeitoso, objetivo e neutro.
Responda EXCLUSIVAMENTE com JSON válido, sem markdown.`;

const BODY_USER_PROMPT = `Observe a silhueta da pessoa na foto e classifique em UMA categoria:
- "triangulo": quadril mais largo que os ombros
- "triangulo_invertido": ombros mais largos que o quadril
- "retangulo": ombros, cintura e quadril em larguras parecidas
- "oval": volume concentrado na região central do corpo
- "trapezio": ombros levemente mais largos, silhueta atlética/equilibrada

Responda com este JSON:
{
  "bodyType": "uma das 5 categorias acima, ou null se não der pra avaliar",
  "explanation": "1 frase curta e gentil em pt-BR explicando a escolha",
  "confidence": "número entre 0 e 1"
}
Se não houver uma pessoa de corpo visível, use bodyType null e confidence baixo.`;

export async function analyzeBodyType(
  mediaType: string,
  base64Data: string,
): Promise<BodyTypeResult> {
  if (!isAiAvailable()) {
    throw new ExternalServiceError(
      "IA de visão não configurada (defina ANTHROPIC_API_KEY e AI_ENABLED=true).",
    );
  }

  try {
    const response = await getAnthropicClient().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 512,
      system: BODY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as SupportedMediaType,
                data: base64Data,
              },
            },
            { type: "text", text: BODY_USER_PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta da IA sem conteúdo de texto.");
    }

    logger.info(
      { tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens },
      "Tipo de corpo analisado por Claude",
    );

    const raw = extractJson(textBlock.text);
    const bodyType = (VALID_BODY_TYPES as readonly string[]).includes(String(raw.bodyType))
      ? (String(raw.bodyType) as BodyTypeGuess)
      : null;
    const explanation = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
    const confidence =
      typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.6;

    return { bodyType, explanation, confidence };
  } catch (err) {
    logger.error({ err }, "Falha ao analisar tipo de corpo com Claude");
    throw new ExternalServiceError(
      "Não foi possível analisar a foto agora.",
      err instanceof Error ? err.message : undefined,
    );
  }
}
