# ---- build
FROM node:24-alpine3.22 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Nenhuma URL da API entra no bundle: o navegador chama /api na própria origem e o servidor do
# Next repassa para API_URL, lida em tempo de execução (ADR 008)
RUN npm run build

# ---- runtime (output standalone: só o servidor e as dependências que ele usa)
FROM node:24-alpine3.22
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
# static não entra no standalone; o node precisa escrever em .next/cache.
# (Sem pasta public: o portal não tem assets estáticos; o ícone fica em src/app/icon.svg.)
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
