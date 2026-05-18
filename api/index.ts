// ============================================================================
//  Entrada serverless da Vercel — função única
// ----------------------------------------------------------------------------
//  Todo o tráfego (rewrite "/(.*)" em vercel.json) cai aqui. Montamos o app
//  Express com createServer() e exportamos. Um app Express já é um handler
//  (req, res), então a Vercel o invoca diretamente.
//
//  O frontend estático (public/) é embutido na função via "includeFiles" no
//  vercel.json e servido pelo express.static dentro de createServer().
//
//  NÃO usar app.listen() aqui — isso é só para o dev local (src/index.ts).
// ============================================================================

import { createServer } from "../src/server";

const app = createServer();

export default app;
