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
