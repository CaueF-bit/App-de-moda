import { analyzeClothingImage } from "../ai/clothingAnalysis";
import { WardrobeItem } from "../types/fashion";
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "erro desconhecido";
}
