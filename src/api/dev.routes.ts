import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { bootstrapMockData, getApiExamples, resetMockData } from "../dev/mockData";

/**
 * Rotas utilitárias de desenvolvimento.
 * Registradas só se NODE_ENV !== "production".
 */
const router = Router();

router.get(
  "/examples",
  asyncHandler(async (_req, res) => {
    return res.status(200).json({ success: true, examples: getApiExamples() });
  }),
);

router.post(
  "/seed",
  asyncHandler(async (_req, res) => {
    const result = await bootstrapMockData();
    return res.status(200).json({
      success: true,
      message: "Dados mock carregados com sucesso.",
      seed: result,
      examples: getApiExamples(),
    });
  }),
);

router.post(
  "/reset",
  asyncHandler(async (_req, res) => {
    await resetMockData();
    return res.status(200).json({
      success: true,
      message: "Dados em memória limpos com sucesso.",
    });
  }),
);

export default router;
