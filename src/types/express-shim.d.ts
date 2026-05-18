/**
 * Extensões dos tipos do Express.
 *
 * Permite usar req.user em controllers sem casts manuais.
 * Populado pelo middleware authenticate().
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
