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
# ponytail: node_modules inteiro (com devDependencies) porque o `migrate deploy` roda no start
# e precisa do CLI do prisma; imagem menor = estágio/job de migração separado
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/prisma7.config.ts ./
COPY --from=build /app/prisma ./prisma
USER node
EXPOSE 3001
# exec: o node substitui o sh como PID 1 e recebe o SIGTERM do `docker stop` (fecha o pool)
CMD ["sh", "-c", "npm run db:deploy && exec node dist/main"]
