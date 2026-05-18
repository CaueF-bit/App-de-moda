import { Router } from "express";
import { getUserProfile } from "../db/userProfile.repository";
import { listWardrobeItemsByUser } from "../db/wardrobe.repository";
import { PackingInput, generateSmartPackingList } from "../services/packingService";
import { NotFoundError } from "../errors/AppError";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { packingSchema } from "../schemas/fashion.schemas";

const router = Router();

router.post(
  "/packing",
  validate(packingSchema),
  asyncHandler(async (req, res) => {
    const { userId, destination, durationDays, weather, plannedOccasions } = req.body;

    const profile = await getUserProfile(userId);
    if (!profile) throw new NotFoundError("Perfil do usuário não encontrado.");

    const wardrobe = await listWardrobeItemsByUser(userId);
    if (wardrobe.length === 0) {
      throw new NotFoundError("Nenhuma peça encontrada no guarda-roupa do usuário.");
    }

    const input: PackingInput = {
      destination,
      durationDays,
      weather,
      wardrobe,
      profile,
      ...(plannedOccasions ? { plannedOccasions } : {}),
    };

    const packingSuggestion = await generateSmartPackingList(input);

    return res.status(200).json({ success: true, packingSuggestion });
  }),
);

export default router;
