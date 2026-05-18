import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authRateLimit } from "../middleware/security";
import { loginSchema, registerUserSchema } from "../schemas/fashion.schemas";
import { getCurrentUser, loginUser, registerUser } from "../services/authService";

/**
 * Rotas de autenticação.
 *
 * POST /auth/register  → cria usuário + retorna token
 * POST /auth/login     → autentica + retorna token
 * GET  /auth/me        → dados do usuário logado (precisa Bearer token)
 */
const router = Router();

router.post(
  "/register",
  authRateLimit,
  validate(registerUserSchema),
  asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    return res.status(201).json(result);
  }),
);

router.post(
  "/login",
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body);
    return res.status(200).json(result);
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: any, res) => {
    const user = await getCurrentUser(req.user.id);
    return res.status(200).json(user);
  }),
);

export default router;
