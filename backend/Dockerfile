# ---- build: dependências + Prisma Client + compilação
FROM node:24-alpine3.22 AS build
# openssl: o Prisma detecta a versão para baixar o schema engine (musl) correto
RUN apk add --no-cache openssl
WORKDIR /app
# O postinstall (prisma generate) precisa do schema e do config antes do npm ci.
# Só o schema: migrations/seed novos não invalidam o cache da camada de install.
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime
FROM node:24-alpine3.22
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
# node_modules inteiro (com devDependencies) porque o `migrate deploy` roda no start e precisa
# do CLI do prisma. Limite conhecido: a imagem fica maior; um job de migração separado resolveria.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/prisma7.config.ts ./
COPY --from=build /app/prisma ./prisma
# O seed (tsx) importa TypeScript de src/: o client gerado e as regras que ele compartilha com a
# API (normalização de tags, assinatura das imagens, limite do conteúdo)
COPY --from=build /app/src ./src
# Conteúdo do portal: a documentação do repositório (contexto "docs" do docker-compose.yml).
# O seed lê o Markdown e os diagramas daqui no primeiro boot
COPY --from=docs . ./docs
ENV SEED_DOCS_DIR=/app/docs
USER node
EXPOSE 3001
# migrations → seed idempotente → API. exec: o node substitui o sh como PID 1 e recebe o
# SIGTERM do `docker stop` (fecha o pool)
CMD ["sh", "-c", "npm run db:deploy && npm run db:seed && exec node dist/main"]
