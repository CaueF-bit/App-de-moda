import { Router } from "express";
import { getAuthenticatedUserId } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { analyzeBodySchema, updateProfileSchema } from "../schemas/fashion.schemas";
import { getOrCreateUserProfile, saveUserProfile } from "../db/userProfile.repository";
import { analyzeBodyType } from "../ai/clothingVision";
import { BadRequestError } from "../errors/AppError";

const IMAGE_DATA_URL_RE = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i;

/**
 * Rotas do perfil de estilo do usuário (autenticadas via /api).
 *
 * GET  /api/profile  → perfil do usuário logado (cria um padrão se não existir)
 * PUT  /api/profile  → atualiza o perfil (usado pela tela de onboarding)
 */
const router = Router();

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const profile = await getOrCreateUserProfile(userId);
    return res.status(200).json(profile);
  }),
);

router.put(
  "/profile",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const current = await getOrCreateUserProfile(userId);
    const body = req.body;

    const updated = {
      ...current,
      ...(body.bodyType ? { bodyType: body.bodyType } : {}),
      ...(body.preferredFits ? { preferredFits: body.preferredFits } : {}),
      ...(body.budgetLimit !== undefined ? { budgetLimit: body.budgetLimit } : {}),
      personalPalette: {
        ...current.personalPalette,
        ...(body.favoriteColors ? { primaryColors: body.favoriteColors } : {}),
        ...(body.avoidColors ? { avoidColors: body.avoidColors } : {}),
      },
    };

    const saved = await saveUserProfile(updated);
    return res.status(200).json(saved);
  }),
);

/**
 * Identifica o tipo de corpo a partir de uma foto (IA de visão).
 * A foto é só analisada — não é salva em lugar nenhum.
 */
router.post(
  "/profile/analyze-body",
  validate(analyzeBodySchema),
  asyncHandler(async (req, res) => {
    getAuthenticatedUserId(req); // exige estar logado
    const match = req.body.image.match(IMAGE_DATA_URL_RE);
    if (!match) {
      throw new BadRequestError("Formato de imagem inválido.");
    }
    const mediaType = match[1].toLowerCase().replace("image/jpg", "image/jpeg");
    const result = await analyzeBodyType(mediaType, match[2]);
    return res.status(200).json(result);
  }),
);

export default router;
