# App de Moda — API Profissional

API REST profissional para recomendação de looks, mala inteligente e feedback de estilo, com IA real (Claude) e fallback heurístico.

## ✨ Recursos

- **TypeScript** com `strict` mode
- **Express** + arquitetura em camadas (routes → services → repositories)
- **Prisma + SQLite** (troca pra Postgres só ajustando 1 linha)
- **Autenticação JWT** com senhas em argon2id
- **Validação Zod** em todos os inputs
- **Error handling centralizado** com classes de erro tipadas
- **Logging estruturado** com pino (pretty em dev, JSON em prod)
- **Segurança**: helmet, CORS, rate limiting
- **IA real**: integração com Claude (Anthropic) com fallback heurístico
- **Documentação OpenAPI** em `/docs`
- **Testes** com Vitest + supertest
- **Docker**: pronto pra deploy

## 📦 Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Linguagem | TypeScript 5 |
| Framework HTTP | Express 4 |
| Banco | SQLite (dev) / Postgres (prod) via Prisma |
| Validação | Zod |
| Auth | argon2 + jsonwebtoken |
| IA | @anthropic-ai/sdk (Claude) |
| Testes | Vitest + supertest |
| Logs | pino |

## 🚀 Setup local

```bash
# 1. Instale dependências
npm install

# 2. Crie o banco SQLite e gere o cliente Prisma
npm run prisma:migrate

# 3. Suba o servidor em modo dev (hot reload)
npm run dev
```

Servidor: <http://localhost:3000>
Docs interativos: <http://localhost:3000/docs>

### Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="troque-em-producao-min-32-caracteres"

# IA — opcional. Se vazio, usa recomendador heurístico.
ANTHROPIC_API_KEY=
AI_ENABLED=false
```

## 🔐 Autenticação

A API usa Bearer JWT. Fluxo:

```bash
# Cadastro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@dev.com","password":"senha12345","name":"Você"}'

# Login (devolve { token, ... })
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@dev.com","password":"senha12345"}'

# Usar o token
curl http://localhost:3000/auth/me -H "Authorization: Bearer <TOKEN>"
```

Em desenvolvimento o seed cria um usuário demo:

```
email:    demo@app-de-moda.dev
senha:    demo12345
userId:   demo-user-1
```

## 🧪 Testes

```bash
npm test              # uma rodada
npm run test:watch    # watch mode
npm run test:coverage # com cobertura
```

## 🐳 Docker

```bash
# Build da imagem
docker compose build

# Subir
docker compose up -d

# Logs
docker compose logs -f api
```

Para Postgres em produção, descomente o serviço `postgres` no `docker-compose.yml` e ajuste `DATABASE_URL` no schema do Prisma.

## 📚 Endpoints principais

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | – | Healthcheck |
| `GET` | `/docs` | – | Swagger UI |
| `POST` | `/auth/register` | – | Cria conta |
| `POST` | `/auth/login` | – | Login |
| `GET` | `/auth/me` | ✅ | Dados do usuário |
| `POST` | `/api/outfit` | ✅ | Gera look |
| `POST` | `/api/feedback` | ✅ | Registra feedback |
| `POST` | `/api/feedback/preview` | ✅ | Simula feedback |
| `POST` | `/api/packing` | ✅ | Gera mala |
| `POST` | `/api/dev/seed` | – (só dev) | Recarrega seed |
| `POST` | `/api/dev/reset` | – (só dev) | Limpa dados |

## 🏗️ Estrutura

```
src/
├── ai/                  # Integração com Claude
├── api/                 # Rotas Express (auth, outfit, feedback, packing, dev)
├── config/              # env (zod), logger (pino), openapi
├── db/                  # Cliente Prisma + repositórios
├── dev/                 # Mock/seed
├── errors/              # AppError + classes específicas
├── middleware/          # auth, errorHandler, security, validate
├── schemas/             # Schemas Zod compartilhados
├── services/            # Regras de negócio
└── types/               # Tipos do domínio (fashion.ts)

prisma/
└── schema.prisma        # Schema do banco

tests/                   # Testes Vitest + supertest
```

## 🔄 Recomendador de looks

O endpoint `POST /api/outfit` tem dois modos:

1. **IA (Claude)** — quando `AI_ENABLED=true` e `ANTHROPIC_API_KEY` estão setados. O Claude recebe perfil + guarda-roupa + ocasião e devolve a melhor combinação de peças.
2. **Heurístico** — pontuação baseada em ocasião, paleta, clima e fit. Roda sempre como fallback caso o Claude falhe. Útil pra CI/testes e modo barato.

## 🛡️ Segurança em produção

- Troque `JWT_SECRET` por algo gerado com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Configure `CORS_ORIGIN` com a lista exata dos seus domínios
- Ajuste `RATE_LIMIT_MAX` ao seu tráfego real
- Use Postgres (não SQLite) em produção
- Rode atrás de TLS (use um reverse proxy: nginx, Caddy, Cloudflare)

## 🗺️ Próximos passos sugeridos

- [ ] Refresh tokens com rotação
- [ ] Upload de imagens de roupa (S3 ou similar) + análise por visão com Claude
- [ ] Webhook para integração com WhatsApp / Telegram
- [ ] Frontend (Next.js, React Native, ou Expo)
- [ ] CI/CD (GitHub Actions) com build, testes e deploy automático
- [ ] Observabilidade: traces (OpenTelemetry) + métricas (Prometheus)

## 📄 Licença

Privado.
