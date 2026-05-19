import { Router } from "express";
import { env } from "../config/env";
import { asyncHandler } from "../middleware/errorHandler";
import { UnauthorizedError } from "../errors/AppError";
import { getAppMetrics } from "../db/metrics.repository";

/**
 * Rotas administrativas — painel privado de métricas.
 *
 * Ficam FORA de "/api" para não passar pelo middleware de autenticação JWT.
 * O acesso é protegido pela chave ADMIN_KEY, enviada no header `x-admin-key`.
 * Se ADMIN_KEY não estiver configurada, todo acesso é negado.
 */
const router = Router();

router.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    const provided = req.headers["x-admin-key"];
    if (!env.ADMIN_KEY || provided !== env.ADMIN_KEY) {
      throw new UnauthorizedError("Chave de administrador inválida ou ausente.");
    }

    const metrics = await getAppMetrics();
    return res.status(200).json(metrics);
  }),
);

export default router;
