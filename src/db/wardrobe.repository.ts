import { prisma } from "./prisma";
import {
  ClothingCategory,
  ClothingLayer,
  FitPreference,
  FormalityLevel,
  MaterialType,
  PatternType,
  SeasonType,
  StyleTag,
  WardrobeItem,
} from "../types/fashion";

/**
 * Repositório de WardrobeItem (peças do guarda-roupa).
 * Mantém a mesma interface da implementação em memória anterior.
 */

interface PrismaWardrobeRow {
  id: string;
  userId: string;
  imageUrl: string;
  category: string;
  layer: string | null;
  subcategory: string | null;
  color: string;
  secondaryColor: string | null;
  pattern: string | null;
  brand: string | null;
  fabric: string | null;
  idealSeason: string | null;
  fit: string | null;
  formality: string | null;
  tags: string | null;
  confidence: number | null;
  isConfirmed: boolean;
}

function rowToItem(row: PrismaWardrobeRow): WardrobeItem {
  return {
    id: row.id,
    userId: row.userId,
    imageUrl: row.imageUrl,
    category: row.category as ClothingCategory,
    layer: (row.layer ?? undefined) as ClothingLayer | undefined,
    subcategory: row.subcategory ?? undefined,
    color: row.color,
    secondaryColor: row.secondaryColor ?? undefined,
    pattern: (row.pattern ?? undefined) as PatternType | string | undefined,
    brand: row.brand ?? undefined,
    fabric: (row.fabric ?? undefined) as MaterialType | string | undefined,
    idealSeason: row.idealSeason ? (JSON.parse(row.idealSeason) as SeasonType[]) : undefined,
    fit: (row.fit ?? undefined) as FitPreference | "unknown" | undefined,
    formality: (row.formality ?? undefined) as FormalityLevel | undefined,
    tags: row.tags ? (JSON.parse(row.tags) as StyleTag[] | string[]) : undefined,
    confidence: row.confidence ?? undefined,
    isConfirmed: row.isConfirmed,
  };
}

function itemToRow(item: WardrobeItem) {
  return {
    id: item.id,
    userId: item.userId,
    imageUrl: item.imageUrl,
    category: item.category,
    layer: item.layer ?? null,
    subcategory: item.subcategory ?? null,
    color: item.color,
    secondaryColor: item.secondaryColor ?? null,
    pattern: item.pattern ?? null,
    brand: item.brand ?? null,
    fabric: item.fabric ?? null,
    idealSeason: item.idealSeason ? JSON.stringify(item.idealSeason) : null,
    fit: item.fit ?? null,
    formality: item.formality ?? null,
    tags: item.tags ? JSON.stringify(item.tags) : null,
    confidence: item.confidence ?? null,
    isConfirmed: item.isConfirmed,
  };
}

export async function saveWardrobeItem(item: WardrobeItem): Promise<WardrobeItem> {
  const data = itemToRow(item);
  const saved = await prisma.wardrobeItem.upsert({
    where: { id: data.id },
    update: data,
    create: data,
  });
  return rowToItem(saved as PrismaWardrobeRow);
}

export async function getWardrobeItemById(id: string): Promise<WardrobeItem | null> {
  const row = await prisma.wardrobeItem.findUnique({ where: { id } });
  return row ? rowToItem(row as PrismaWardrobeRow) : null;
}

export async function listWardrobeItemsByUser(userId: string): Promise<WardrobeItem[]> {
  const rows = await prisma.wardrobeItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => rowToItem(r as PrismaWardrobeRow));
}

export async function clearWardrobeItems(): Promise<void> {
  await prisma.wardrobeItem.deleteMany();
}
