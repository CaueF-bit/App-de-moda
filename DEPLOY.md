# Guia de Deploy — App de Moda

Esse arquivo documenta como subir o app pra produção. Já está tudo pronto pra fazer deploy no **Railway** (recomendado pra começar) ou em qualquer plataforma Node.js.

---

## ✅ Checklist pré-deploy

Antes de fazer o primeiro deploy, garanta que:

- [ ] O app roda local sem erros (`npm run dev`)
- [ ] Todos os testes passam (`npm test`)
- [ ] O build compila sem warnings (`npm run build`)
- [ ] Você tem uma conta no GitHub
- [ ] Você tem uma conta no Railway (https://railway.app)
- [ ] Você tem uma API key da Anthropic (opcional — só se quiser IA real)

---

## 🚀 Deploy no Railway (recomendado)

### 1. Mudar Prisma de SQLite pra PostgreSQL

Em `prisma/schema.prisma`, encontre:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

E troque para:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> **Atenção:** essa mudança quebra o dev local com SQLite. Você pode manter um branch `main` (Postgres, pra deploy) e um branch `dev` (SQLite) — ou rodar Postgres local via Docker.

### 2. Apagar a migração antiga (era de SQLite)

```bash
rm -rf prisma/migrations
```

### 3. Gerar um JWT_SECRET forte

```bash
npm run generate-secret
```

Vai imprimir algo tipo `4d2f8b9c...` (128 caracteres). **Copia isso**, vai usar daqui a pouco.

### 4. Subir o código pro GitHub

```bash
git init
git add .
git commit -m "Preparado pra deploy"
```

No GitHub:
1. Crie um repositório novo (privado)
2. Siga as instruções pra `git push` do projeto local
3. **NÃO suba o `.env`** — já está no `.gitignore`

### 5. Criar projeto no Railway

1. Vai em https://railway.app
2. Login com GitHub
3. **"New Project"** → **"Deploy from GitHub repo"**
4. Selecione o repositório
5. Railway detecta Node.js automaticamente e começa o build

### 6. Adicionar PostgreSQL

Dentro do projeto Railway:
1. Clica em **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway cria o banco e injeta automaticamente `DATABASE_URL` no seu serviço

### 7. Configurar variáveis de ambiente

No serviço da API (não no Postgres), vai na aba **"Variables"** e adiciona:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (o segredo que você gerou no passo 3) |
| `JWT_EXPIRES_IN` | `7d` |
| `LOG_LEVEL` | `info` |
| `CORS_ORIGIN` | URL do frontend (ou `*` enquanto testa) |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `ANTHROPIC_API_KEY` | (opcional, sua chave da Anthropic) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
| `AI_ENABLED` | `true` se vai usar IA, senão `false` |

> `DATABASE_URL` e `PORT` já vêm automaticamente do Railway — não precisa criar.

### 8. Deploy

Railway faz deploy automático a cada `git push` na branch principal. Quando termina, gera uma URL tipo:

```
https://app-de-moda-production.up.railway.app
```

### 9. Migrar o banco

Na primeira vez (ou quando mudar o schema), as migrations rodam automaticamente via o script `start:prod` que está no `package.json`:

```
prisma migrate deploy && node dist/index.js
```

Se quiser rodar manualmente, no Railway:
1. Aba **"Deployments"** → último deploy → **"View Logs"**
2. Ou use o Railway CLI: `railway run npx prisma migrate deploy`

### 10. Testar

```bash
curl https://seu-app.up.railway.app/health
```

Deve retornar `{"status":"healthy",...}`.

Abre a URL no navegador → vê o frontend!

---

## 🔄 Atualizações futuras

A partir do primeiro deploy, é só:

```bash
git add .
git commit -m "Nova feature"
git push
```

Railway faz deploy automático. ✨

---

## 🆘 Problemas comuns

### "Cannot connect to database"
- Confere se o plugin Postgres foi adicionado ao mesmo projeto Railway
- Confere se `DATABASE_URL` aparece nas variáveis (Railway injeta sozinho)
- Confere se você mudou `provider` pra `postgresql` no `schema.prisma`

### "JWT_SECRET é obrigatória"
- Confere se a variável foi setada nas Variables do Railway
- Lembra que tem que ter pelo menos 32 caracteres

### "503 Service Unavailable"
- Provavelmente o servidor não está ouvindo em `0.0.0.0` — já corrigi isso no `src/index.ts`
- Pode ser que o build esteja falhando — confere logs

### Erros de migration
- Em produção use `prisma migrate deploy`, NÃO `migrate dev`
- Se travou, pode resetar: `railway run npx prisma migrate reset --force` (CUIDADO: apaga dados)

---

## 🌐 Domínio próprio

No Railway:
1. Aba **"Settings"** → **"Domains"** → **"Custom Domain"**
2. Adiciona `app.seudominio.com.br`
3. No seu registrador de DNS, cria um CNAME apontando pro endereço que o Railway te der

---

## 📊 Monitoramento

Railway já vem com:
- **Logs em tempo real** (aba Deployments → View Logs)
- **Métricas** (CPU, RAM, network)
- **Notificações** (webhook ou email em caso de falha)

Pra observabilidade mais avançada, dá pra plugar:
- Sentry (rastreamento de erros)
- Better Stack (uptime monitoring)
- Datadog / Grafana (métricas avançadas)

---

## 💰 Custos esperados

| Item | Custo |
|---|---|
| Railway (free tier) | $5 de crédito grátis/mês |
| API Anthropic | ~$0.003 por look gerado (Claude Sonnet) |
| Domínio | R$40-100/ano |

Pra um MVP com poucos usuários, dá pra ficar dentro do free tier do Railway.

---

## 🔐 Boas práticas em produção

- [ ] Rotacionar `JWT_SECRET` periodicamente (a cada 6 meses)
- [ ] Configurar `CORS_ORIGIN` com domínios reais (não `*`)
- [ ] Adicionar HTTPS-only cookies se for migrar do JWT pra session cookies
- [ ] Ativar 2FA na conta Railway e no GitHub
- [ ] Fazer backup periódico do Postgres (Railway oferece snapshots automáticos)
- [ ] Configurar alertas de erro (logs com `level: "error"` no pino → webhook)
