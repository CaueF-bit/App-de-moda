# =============================================================================
# Multi-stage Dockerfile para a API de moda
# =============================================================================

# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Argon2 precisa de build-essential (alpine: python3, make, g++)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npx prisma generate
RUN npm run build

# Remove devDependencies para a imagem final
RUN npm prune --production

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL é exigido por Prisma; libstdc++ por argon2 nativo
RUN apk add --no-cache openssl libstdc++

# Cria usuário não-root pra rodar a app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 -G nodejs

COPY --from=builder --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=app:nodejs /app/dist ./dist
COPY --from=builder --chown=app:nodejs /app/prisma ./prisma
COPY --from=builder --chown=app:nodejs /app/public ./public
COPY --from=builder --chown=app:nodejs /app/package.json ./

USER app

EXPOSE 3000

# Healthcheck simples
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Em produção rodamos migrations antes de subir o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
