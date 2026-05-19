import { analyzeClothingImage } from "../ai/clothingAnalysis";
import { analyzeClothingPhoto } from "../ai/clothingVision";
import { isAiAvailable } from "../ai/claudeClient";
import { ClothingAttributes, WardrobeItem } from "../types/fashion";
import { saveWardrobeItem } from "../db/wardrobe.repository";

interface IngestClothingInput {
  userId: string;
  imageUrl: string;
  expectedCategory?: WardrobeItem["category"];
  occasion?: string;
}

export async function ingestWardrobeItem(input: IngestClothingInput): Promise<WardrobeItem> {
  validateIngestionInput(input);

  try {
    const analyzed = await analyzeClothingImage(input.imageUrl, {
      userId: input.userId,
      occasion: input.occasion,
      expectedCategory: input.expectedCategory,
      includeAlternatives: true,
      removeBackground: true,
    });

    const item: WardrobeItem = {
      id: createWardrobeItemId(),
      userId: input.userId.trim(),
      imageUrl: analyzed.backgroundRemovedUrl,
      ...analyzed.item,
      confidence: analyzed.confidence,
      isConfirmed: false,
    };

    await saveWardrobeItem(item);
    return item;
  } catch (error) {
    throw new Error(
      `Nao foi possivel processar a imagem do guarda-roupa: ${getErrorMessage(error)}`,
    );
  }
}

function validateIngestionInput(input: IngestClothingInput): void {
  if (!input.userId.trim()) {
    throw new Error("O userId e obrigatorio para cadastrar uma peca no guarda-roupa.");
  }

  if (!input.imageUrl.trim()) {
    throw new Error("A imageUrl e obrigatoria para iniciar a analise da peca.");
  }
}

function createWardrobeItemId(): string {
  return `wardrobe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ===========================================================================
//  Cadastro de peça a partir de uma FOTO enviada pelo usuário.
//  A foto chega como data URL base64 (ex.: "data:image/jpeg;base64,...") e é
//  guardada assim mesmo no campo imageUrl — sem disco, compatível com a Vercel.
// ===========================================================================

/** data URLs de imagem aceitas: jpeg, png, webp, gif. */
const DATA_URL_RE = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i;

export interface RegisterWardrobeItemInput {
  userId: string;
  /** Foto da peça como data URL base64. */
  imageDataUrl: string;
  /** Campos preenchidos manualmente — sempre vencem o que a IA detectou. */
  overrides?: Partial<ClothingAttributes>;
}

export interface RegisterWardrobeItemResult {
  item: WardrobeItem;
  /** true se a peça foi analisada pela IA de visão. */
  aiUsed: boolean;
  confidence: number;
  warnings: string[];
}

/**
 * Cadastra uma peça no guarda-roupa a partir da foto enviada pelo usuário.
 *
 * - Se a IA estiver configurada, o Claude analisa a foto e preenche os
 *   atributos (categoria, cor, tecido, etc.).
 * - Se não estiver, a peça é salva com dados básicos + um aviso para o
 *   usuário completar manualmente — nunca quebra.
 * - `overrides` (dados que o usuário digitou) sempre têm prioridade.
 */
export async function registerWardrobeItem(
  input: RegisterWardrobeItemInput,
): Promise<RegisterWardrobeItemResult> {
  const userId = input.userId.trim();
  if (!userId) {
    throw new Error("O userId é obrigatório para cadastrar uma peça no guarda-roupa.");
  }

  const imageDataUrl = input.imageDataUrl.trim();
  const match = imageDataUrl.match(DATA_URL_RE);
  if (!match) {
    throw new Error("A foto precisa ser uma imagem JPEG, PNG ou WebP em base64.");
  }
  const mediaType = match[1].toLowerCase().replace("image/jpg", "image/jpeg");
  const base64Data = match[2];

  const warnings: string[] = [];
  let attributes: ClothingAttributes = { category: "outro", color: "indefinida" };
  let confidence = 0;
  let aiUsed = false;

  if (isAiAvailable()) {
    try {
      const vision = await analyzeClothingPhoto(mediaType, base64Data);
      attributes = vision.item;
      confidence = vision.confidence;
      aiUsed = true;
      if (vision.warnings?.length) warnings.push(...vision.warnings);
    } catch {
      warnings.push(
        "A IA não conseguiu analisar a foto agora; a peça foi salva com dados básicos — edite-a para completar.",
      );
    }
  } else {
    warnings.push(
      "IA de visão desativada — a peça foi salva com dados básicos. Edite-a para completar os detalhes.",
    );
  }

  const merged: ClothingAttributes = { ...attributes, ...stripEmpty(input.overrides) };

  const item: WardrobeItem = {
    id: createWardrobeItemId(),
    userId,
    imageUrl: imageDataUrl,
    ...merged,
    ...(confidence > 0 ? { confidence } : {}),
    isConfirmed: false,
  };

  const saved = await saveWardrobeItem(item);
  return { item: saved, aiUsed, confidence, warnings };
}

/** Remove chaves vazias/undefined para que os overrides não apaguem dados da IA. */
function stripEmpty<T extends object>(obj: T | undefined): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as Partial<T>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "erro desconhecido";
}
