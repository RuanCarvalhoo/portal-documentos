# ---- build
FROM node:24-alpine3.22 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* é embutido no bundle durante o build: por isso é build arg, não env de runtime
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
