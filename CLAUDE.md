# App de Moda

Stylist pessoal com IA: gera looks, monta mala de viagem e organiza um
guarda-roupa digital. Backend Express + Prisma; frontend estático em `public/`.

## ⚠️ Deploy: SEMPRE para a Vercel

Este projeto é publicado na **Vercel**. Toda configuração, código e decisão de
arquitetura deve mirar deploy na Vercel:

- O backend roda como **função serverless** em `api/server.ts` (que exporta o
  app Express criado por `createServer()`). **Nunca** chamar `app.listen()` no
  caminho de produção da Vercel — `src/index.ts` (com `listen`) é só para dev local.
- Banco de dados em produção é **PostgreSQL hospedado** (Neon / Vercel Postgres).
  Use sempre a *connection string com pooling*. SQLite só existe no dev local.
- Roteamento e build são definidos em `vercel.json`.
- Variáveis de ambiente são configuradas no painel da Vercel, não em `.env`.
- Ao adicionar dependências ou rotas, garantir compatibilidade com o runtime
  serverless da Vercel (sem processos longos, sem estado em memória entre requests,
  sem escrita no disco fora de `/tmp`).

> O arquivo `DEPLOY.md` descreve um plano antigo para Railway — está obsoleto.
> A fonte de verdade para deploy é a Vercel.

## ⚠️ GitHub + Vercel: SEMPRE atualizar após cada mudança

**Sempre que o usuário pedir algo novo ou uma alteração**, depois de implementar:

1. Commitar e dar push para `https://github.com/CaueF-bit/App-de-moda` (branch `main`):
   ```
   git add -A && git commit -m "<descrição>" && git push
   ```
2. O push na `main` dispara o **deploy automático na Vercel**.
3. Verificar que o deploy ficou `Ready` (ex.: `vercel ls app-de-moda`) e que o
   site responde — não considerar a tarefa concluída até o deploy passar.

Isto não é opcional: cada feature/correção termina com GitHub e Vercel atualizados.

## Configuração de deploy na Vercel (não quebrar)

- `vercel.json` usa `"framework": null` — **não remover**. O preset "express" da
  Vercel cria funções fantasma e quebra o deploy.
- Há **uma única função**: `api/index.ts`, que recebe todo o tráfego via o
  rewrite `/(.*) -> /api`. O `public/` é embutido nela via `includeFiles`.
- Banco: Postgres (Neon) já provisionado; `DATABASE_URL` e `JWT_SECRET` estão
  nas Environment Variables da Vercel.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM (PostgreSQL em produção, SQLite no dev local)
- Autenticação JWT (argon2 para hash de senha)
- Zod para validação
- IA opcional via `@anthropic-ai/sdk`

## Estrutura

- `api/server.ts` — entrada serverless da Vercel (exporta o app Express)
- `src/server.ts` — `createServer()`: monta o app Express (sem `listen`)
- `src/index.ts` — bootstrap para **dev local** (faz `listen` + seed)
- `src/api/` — rotas; `src/services/` — regras de negócio; `src/db/` — repositórios Prisma
- `public/` — frontend estático (servido pela CDN da Vercel)
- `prisma/schema.prisma` — schema do banco

## Comandos

- `npm run dev` — servidor local em http://localhost:3000
- `npm test` — testes (vitest)
- `npm run build` — compila TypeScript para `dist/`
- `npx prisma db push` — sincroniza o schema com o banco

## Convenções

- Comentários e mensagens ao usuário em português.
- O frontend segue estética editorial de moda (paleta bege/areia, serifa
  Bodoni Moda) — ver `public/style.css`.
