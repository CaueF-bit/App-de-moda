import { ZodSchema } from "zod";

/**
 * Middleware factory que valida o body, query ou params da request.
 * Joga ZodError pra frente — o errorHandler captura e formata.
 *
 * Uso:
 *   router.post("/x", validate(createUserSchema), controller)
 *   router.get("/x", validate(querySchema, "query"), controller)
 */
export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: any, _res: any, next: any) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
