import { z } from "zod";

/**
 * Schemas Zod compartilhados pelas rotas e serviços.
 * Centralizar evita duplicação de validação e mantém o domínio coeso.
 */

export const weatherSchema = z.enum(["quente", "ameno", "frio", "chuvoso"]);
export const feedbackActionSchema = z.enum(["like", "dislike"]);

export const generateOutfitSchema = z.object({
  userId: z.string().trim().min(1, "userId é obrigatório"),
  occasion: z.string().trim().min(1, "occasion é obrigatório"),
  vibe: z.string().trim().min(1).optional(),
  weather: weatherSchema,
});

export type GenerateOutfitInput = z.infer<typeof generateOutfitSchema>;

export const feedbackSchema = z.object({
  userId: z.string().trim().min(1, "userId é obrigatório"),
  outfitId: z.string().trim().min(1, "outfitId é obrigatório"),
  action: feedbackActionSchema,
  occasion: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const packingSchema = z.object({
  userId: z.string().trim().min(1, "userId é obrigatório"),
  destination: z.string().trim().min(1, "destination é obrigatório"),
  durationDays: z
    .number()
    .int("durationDays precisa ser inteiro")
    .positive("durationDays precisa ser maior que zero"),
  weather: weatherSchema,
  plannedOccasions: z.array(z.string().trim().min(1)).optional(),
});

export type PackingRouteInput = z.infer<typeof packingSchema>;

export const registerUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z
    .string()
    .min(8, "Senha precisa ter no mínimo 8 caracteres")
    .max(128, "Senha muito longa"),
  name: z.string().trim().min(1, "name é obrigatório").max(120),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
//  Guarda-roupa — cadastro de peças por foto
// ---------------------------------------------------------------------------

export const clothingCategorySchema = z.enum([
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
]);

export const fitSchema = z.enum(["slim", "regular", "oversized", "tailored"]);
export const formalitySchema = z.enum(["casual", "smart_casual", "social", "elegante"]);

/** Campos editáveis de uma peça (usados em overrides e na edição). */
const wardrobeAttributesShape = {
  category: clothingCategorySchema.optional(),
  subcategory: z.string().trim().min(1).max(120).optional(),
  color: z.string().trim().min(1).max(40).optional(),
  secondaryColor: z.string().trim().min(1).max(40).optional(),
  pattern: z.string().trim().min(1).max(40).optional(),
  fabric: z.string().trim().min(1).max(40).optional(),
  brand: z.string().trim().min(1).max(80).optional(),
  fit: fitSchema.optional(),
  formality: formalitySchema.optional(),
};

export const registerWardrobeSchema = z.object({
  // data URL base64 de uma imagem (jpeg/png/webp/gif).
  image: z
    .string()
    .trim()
    .min(1, "A foto da peça é obrigatória")
    .regex(/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i, "Formato de imagem inválido"),
  ...wardrobeAttributesShape,
});

export type RegisterWardrobeInput = z.infer<typeof registerWardrobeSchema>;

export const updateWardrobeSchema = z
  .object({
    ...wardrobeAttributesShape,
    isConfirmed: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export type UpdateWardrobeInput = z.infer<typeof updateWardrobeSchema>;
