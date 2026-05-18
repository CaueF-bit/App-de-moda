import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { feedbackSchema } from "../schemas/fashion.schemas";
import {
  previewFeedbackImpact,
  registerOutfitFeedback,
} from "../services/feedbackService";

const router = Router();

router.post(
  "/feedback",
  validate(feedbackSchema),
  asyncHandler(async (req, res) => {
    const result = await registerOutfitFeedback(req.body);
    return res.status(200).json({ success: true, result });
  }),
);

router.post(
  "/feedback/preview",
  validate(feedbackSchema),
  asyncHandler(async (req, res) => {
    const preview = await previewFeedbackImpact(req.body);
    return res.status(200).json({ success: true, preview });
  }),
);

export default router;
