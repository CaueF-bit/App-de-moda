// ============================================================================
//  Entrada serverless da Vercel
// ----------------------------------------------------------------------------
//  A Vercel não roda um servidor que fica "ligado" — ela invoca uma função a
//  cada request. Por isso aqui NÃO usamos app.listen(): apenas montamos o app
//  Express com createServer() e o exportamos. Um app Express é, por si só, um
//  handler (req, res), então a Vercel consegue chamá-lo diretamente.
//
//  O bootstrap com listen() + seed continua em src/index.ts, usado só no
//  desenvolvimento local (npm run dev).
// ============================================================================

import { createServer } from "../src/server";

const app = createServer();

export default app;
