import { Router } from "express";
import { getAuthenticatedUserId } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { registerWardrobeSchema, updateWardrobeSchema } from "../schemas/fashion.schemas";
import { registerWardrobeItem } from "../services/wardrobeIngestionService";
import {
  deleteWardrobeItem,
  getWardrobeItemById,
  listWardrobeItemsByUser,
  saveWardrobeItem,
} from "../db/wardrobe.repository";
import { NotFoundError } from "../errors/AppError";

/**
 * Rotas do guarda-roupa digital (todas autenticadas via /api).
 *
 * GET    /api/wardrobe       → lista as peças do usuário logado
 * POST   /api/wardrobe       → cadastra uma peça a partir de uma foto (IA analisa)
 * PATCH  /api/wardrobe/:id   → edita/confirma os dados de uma peça
 * DELETE /api/wardrobe/:id   → remove uma peça
 */
const router = Router();

router.get(
  "/wardrobe",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const items = await listWardrobeItemsByUser(userId);
    return res.status(200).json(items);
  }),
);

router.post(
  "/wardrobe",
  validate(registerWardrobeSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const { image, ...overrides } = req.body;

    const result = await registerWardrobeItem({
      userId,
      imageDataUrl: image,
      overrides,
    });

    return res.status(201).json(result);
  }),
);

router.patch(
  "/wardrobe/:id",
  validate(updateWardrobeSchema),
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const existing = await getWardrobeItemById(req.params.id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Peça não encontrada no seu guarda-roupa.");
    }

    const updated = await saveWardrobeItem({ ...existing, ...req.body });
    return res.status(200).json(updated);
  }),
);

router.delete(
  "/wardrobe/:id",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const removed = await deleteWardrobeItem(req.params.id, userId);
    if (!removed) {
      throw new NotFoundError("Peça não encontrada no seu guarda-roupa.");
    }
    return res.status(204).send();
  }),
);

export default router;
