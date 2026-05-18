/**
 * Spec OpenAPI 3.0 da API.
 *
 * Em projetos maiores, vale gerar o spec a partir dos schemas Zod
 * (com `zod-to-openapi`). Para esse MVP, mantemos um spec inline e curto
 * — mais fácil de ler e atualizar.
 */
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "App de Moda API",
    version: "1.0.0",
    description:
      "API REST para recomendação de looks, mala inteligente e feedback de estilo. " +
      "Usa Claude (Anthropic) para sugestões com IA real e cai em recomendador heurístico se a IA estiver desabilitada.",
  },
  servers: [{ url: "http://localhost:3000", description: "Local" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Outfit" },
    { name: "Feedback" },
    { name: "Packing" },
    { name: "Dev" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          name: { type: "string" },
          token: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        responses: { "200": { description: "Healthy" } },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Cadastra novo usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Usuário criado", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "409": { description: "Email já cadastrado" },
          "422": { description: "Validação falhou" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autentica usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "401": { description: "Credenciais inválidas" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Dados do usuário logado",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK" },
          "401": { description: "Não autenticado" },
        },
      },
    },
    "/api/outfit": {
      post: {
        tags: ["Outfit"],
        summary: "Gera look recomendado",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "occasion", "weather"],
                properties: {
                  userId: { type: "string" },
                  occasion: { type: "string", example: "jantar" },
                  vibe: { type: "string", example: "elegante minimalista" },
                  weather: { type: "string", enum: ["quente", "ameno", "frio", "chuvoso"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Outfits gerados" },
          "401": { description: "Não autenticado" },
          "404": { description: "Perfil ou guarda-roupa não encontrado" },
        },
      },
    },
    "/api/feedback": {
      post: {
        tags: ["Feedback"],
        summary: "Registra feedback de um outfit (atualiza pesos de preferência)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "outfitId", "action"],
                properties: {
                  userId: { type: "string" },
                  outfitId: { type: "string" },
                  action: { type: "string", enum: ["like", "dislike"] },
                  occasion: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/feedback/preview": {
      post: {
        tags: ["Feedback"],
        summary: "Simula impacto do feedback sem persistir",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Preview" } },
      },
    },
    "/api/packing": {
      post: {
        tags: ["Packing"],
        summary: "Gera lista de mala inteligente",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "destination", "durationDays", "weather"],
                properties: {
                  userId: { type: "string" },
                  destination: { type: "string" },
                  durationDays: { type: "integer", minimum: 1 },
                  weather: { type: "string", enum: ["quente", "ameno", "frio", "chuvoso"] },
                  plannedOccasions: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Mala sugerida" } },
      },
    },
    "/api/dev/seed": {
      post: { tags: ["Dev"], summary: "Recarrega seed de demonstração", responses: { "200": { description: "OK" } } },
    },
    "/api/dev/reset": {
      post: { tags: ["Dev"], summary: "Limpa dados", responses: { "200": { description: "OK" } } },
    },
    "/api/dev/examples": {
      get: { tags: ["Dev"], summary: "Mostra exemplos de payload", responses: { "200": { description: "OK" } } },
    },
  },
} as const;
