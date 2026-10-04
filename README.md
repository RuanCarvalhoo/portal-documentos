# Portal de Documentação

Portal web para times criarem e organizarem documentação em **páginas Markdown**, agrupadas em **espaços** e organizadas em **árvore** (páginas e subpáginas), com **busca** por título e conteúdo e **autenticação JWT**.

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **API:** NestJS 12 + Prisma 7 + PostgreSQL 17
- **Infra:** Docker Compose — um comando sobe banco, API e frontend, com migrations e seed automáticos

---

## Como rodar

Pré-requisito: **Docker** (Docker Desktop no Windows/macOS) em execução.

```bash
docker compose up --build
```

O primeiro build leva alguns minutos (instala as dependências e compila as duas aplicações). Quando os três serviços ficam *healthy*, acesse:

| O quê | Endereço |
|---|---|
| Portal (frontend) | http://localhost:3000 |
| API | http://localhost:3001 |
| Documentação da API (Swagger) | http://localhost:3001/docs |
| Health check (API + banco) | http://localhost:3001/health |

**Usuário de demonstração** (criado pelo seed): `demo@example.com` / `demo1234` — ou crie uma conta em **Criar conta**.

Para parar: `docker compose down`. Para recomeçar do zero (apaga o banco): `docker compose down -v`.

> Portas usadas no host: **3000** (web), **3001** (API) e **5433** (PostgreSQL, só em `127.0.0.1` — a 5432 fica livre para um Postgres local).

### O que acontece no `up`

1. `db` sobe e só fica *healthy* quando o Postgres aceita conexões TCP.
2. `backend` aplica as migrations (`prisma migrate deploy`), roda o **seed idempotente** (só cria o conteúdo de exemplo se o banco estiver vazio) e sobe a API; fica *healthy* quando `/health` consegue consultar o banco.
3. `frontend` sobe depois da API saudável.

### Variáveis de ambiente

Todas têm **valores padrão de desenvolvimento** no `docker-compose.yml`, então nada precisa ser configurado para avaliar o projeto. Em qualquer outro ambiente, defina pelo menos `JWT_SECRET` e as credenciais do banco.

| Variável | Padrão | Uso |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `portal-documentos` | Banco (montam o `DATABASE_URL` da API; evite `@ : / # ?` na senha, que quebrariam a URL) |
| `JWT_SECRET` | segredo de desenvolvimento **público** | Assinatura dos tokens (mínimo 32 caracteres, validado no boot) |
| `CORS_ORIGIN` | `http://localhost:3000` | Única origem autorizada a chamar a API |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL da API vista pelo navegador (embutida no build do frontend) |

---

## Funcionalidades

- **Espaços:** listar, criar, editar e excluir (exclui também as páginas, com confirmação).
- **Páginas em árvore:** criar na raiz ou como subpágina, mover para outro pai do mesmo espaço (ciclos bloqueados), editar e excluir (com as subpáginas, após confirmação).
- **Leitura:** Markdown renderizado — títulos, listas, tarefas, tabelas, links, imagens, citações e **blocos de código com syntax highlight**; **sumário** (TOC) gerado dos títulos; breadcrumb; quem criou e quem editou por último, com datas.
- **Editor:** textarea Markdown com **pré-visualização ao vivo** feita pelo mesmo componente da leitura.
- **Edição concorrente:** se outra pessoa salvou a página antes, a API responde **409** e o texto digitado é mantido (concorrência otimista).
- **Busca** por título e conteúdo, paginada, com trecho e termo destacado.
- **Autenticação JWT:** leitura pública; criar, editar e excluir exigem login (botões de escrita só aparecem para quem está logado, e a API recusa com 401).
- **Interface** conforme o wireframe: header fixo com busca e área do usuário, **barra lateral global** com todos os espaços e suas árvores recolhíveis (estado salvo no navegador, ancestrais da página atual abertos), **modo escuro** e **layout responsivo** (barra lateral vira gaveta no celular).

---

## Arquitetura

```
Navegador ──────────────► frontend :3000 (Next.js)
   │                         │  Server Components buscam dados em
   │                         └─► http://backend:3001   (rede interna do Compose)
   │
   └── formulários / login ─► http://localhost:3001     (URL pública da API)
                                  backend :3001 (NestJS)
                                     └─► db :5432 (PostgreSQL)
```

Dentro do Docker, os containers se encontram pelo **nome do serviço**; o navegador só enxerga as portas publicadas no host. Por isso o frontend usa **duas URLs** da API: a interna para renderizar no servidor e a pública para as chamadas feitas pelo navegador.

### Estrutura

```
backend/
  prisma/            schema, migrations, seed idempotente
  src/
    auth/            cadastro, login, perfil, AuthGuard (JWT) e @CurrentUser
    spaces/          CRUD de espaços
    pages/           CRUD de páginas, regras da árvore, concorrência, /navigation
    search/          busca paginada com trecho
    health/          readiness (API + banco)
    common/          filtro global de erros, paginação, validação de ids
    config/          validação das variáveis de ambiente no boot
  test/              testes e2e (supertest contra o banco)
frontend/src/
  app/               rotas (App Router): /, /spaces/…, /pages/…, /search, /login, /register
  components/        shell (header, sidebar), Markdown, editor, formulários
  lib/               cliente da API, helpers puros testados (árvore, TOC, redirect seguro…)
docs/adr/            registros de decisões de arquitetura
```

---

## Stack e justificativas

| Tema | Escolha | Por quê |
|---|---|---|
| Banco | **PostgreSQL 17** | Dados fortemente relacionais (espaço → página → página pai → autor) com integridade e `ON DELETE CASCADE` garantidos pelo banco; busca por substring indexada sem infraestrutura extra (`pg_trgm`). O Prisma não tem `migrate` para MongoDB. [ADR 001](docs/adr/001-banco-de-dados-postgresql.md) |
| ORM | **Prisma 7** | Schema declarativo, migrations versionadas, tipos gerados; driver adapter `pg`. |
| Árvore | **Lista de adjacência** (`parent_id`) | Mover página é um `UPDATE`; a árvore inteira sai em 1 query e é montada em O(n) (sem N+1). [ADR 002](docs/adr/002-modelagem-da-arvore.md) |
| Busca | **`ILIKE` + índices GIN `pg_trgm`** | Acha trechos de palavras em título e conteúdo, com índice. [ADR 003](docs/adr/003-busca-trigram.md) |
| Autenticação | **JWT HS256** + guard próprio, **bcryptjs** | Sem estado de sessão no servidor; guard simples seguindo a documentação do Nest; bcryptjs é JS puro (sem toolchain nativa no Alpine). [ADR 004](docs/adr/004-autenticacao-jwt.md) |
| Concorrência | **Otimista** (`version`) | Evita que uma edição apague outra sem lock. [ADR 005](docs/adr/005-concorrencia-otimista.md) |
| Cache | **Não cachear por enquanto** | A navegação já é barata por desenho; cache só com medição. [ADR 006](docs/adr/006-cache-da-navegacao.md) |
| API | **NestJS** | Módulos, injeção de dependência, `ValidationPipe` + DTOs, Swagger gerado dos DTOs. |
| Frontend | **Next.js App Router** | Leitura renderizada no servidor (rápida e indexável); formulários como Client Components. |
| Markdown | **react-markdown** + remark-gfm + rehype-slug + rehype-highlight | Seguro por padrão (sem HTML cru); o mesmo componente na leitura e no preview. |
| Estilo | **Tailwind CSS 4** + typography | Tokens de cor com tema claro/escuro; sem biblioteca de componentes. |

---

## Modelo de dados

| Tabela | Campos principais |
|---|---|
| `users` | `id` (uuid v7), `name`, `email` (único, minúsculas), `password_hash`, datas |
| `spaces` | `id`, `name`, `description?`, datas |
| `pages` | `id`, `title`, `content` (Markdown), `space_id` → spaces (**cascade**), `parent_id?` → pages (**cascade**), `position`, `version`, `created_by_id` / `updated_by_id` → users, datas |

Índices e por quê:

- `(space_id, parent_id, position)` — serve a montagem das árvores (e, pelo prefixo à esquerda, consultas só por espaço).
- `(parent_id)` — o Postgres não indexa FKs sozinho; o `ON DELETE CASCADE` da hierarquia procura as filhas por ele.
- GIN `gin_trgm_ops` em `title` e `content` — busca por substring.
- As FKs de autor ficam **sem** índice de propósito: usuários nunca são excluídos, então o índice só encareceria cada escrita.

---

## API

Documentação interativa completa em **http://localhost:3001/docs** (Swagger, com botão *Authorize* para o token).

| Método | Rota | Auth | Respostas |
|---|---|---|---|
| POST | `/auth/register` | — | 201, 400, 409 (e-mail em uso), 429 |
| POST | `/auth/login` | — | 200, 400, 401 (genérico), 429 |
| GET | `/auth/me` | ✔ | 200, 401 |
| GET | `/spaces?page&limit` | — | 200 `{ data, meta }`, 400 |
| POST | `/spaces` | ✔ | 201, 400, 401 |
| GET / PATCH / DELETE | `/spaces/:id` | PATCH/DELETE ✔ | 200 / 200 / 204, 400, 401, 404 |
| POST | `/spaces/:spaceId/pages` | ✔ | 201, 400 (pai inválido), 401, 404 |
| GET / PATCH / DELETE | `/pages/:id` | PATCH/DELETE ✔ | 200 / 200 / 204, 400 (ciclo), 401, 404, **409** (versão desatualizada) |
| GET | `/navigation` | — | 200 — todos os espaços com suas árvores |
| GET | `/search?q&page&limit` | — | 200, 400 (termo inválido), 429 |
| GET | `/health` | — | 200, 503 |

Todo erro sai no mesmo formato:

```json
{ "statusCode": 404, "error": "Not Found", "message": "Página não encontrada", "path": "/pages/…", "timestamp": "…" }
```

---

## Segurança

- **Entrada:** `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted` (campo fora do DTO vira 400 — sem mass assignment); ids validados como UUID antes de chegar ao banco; limites de tamanho em todos os textos.
- **Senhas:** bcryptjs (custo 10), limite de 72 **bytes** (o limite real do bcrypt); o hash nunca sai da API (`select` explícito).
- **Login:** 401 genérico e bcrypt executado mesmo para e-mail inexistente (nem a mensagem nem o tempo revelam contas); **rate limit** em login, cadastro e busca.
- **Tokens:** HS256 com algoritmo fixo na verificação; `JWT_SECRET` obrigatório com mínimo de 32 caracteres; expiração de 8 h.
- **Headers:** `helmet` na API; `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` e `Permissions-Policy` no frontend; CORS restrito à origem do frontend.
- **XSS:** o Markdown é renderizado **sem HTML cru** (sem `rehype-raw`) e links `javascript:` são descartados.
- **Redirect após login:** só caminhos internos (testado contra variantes como `/%09/site.com`).
- **SQL:** consultas pelo Prisma (parametrizadas); o único SQL manual (lock do espaço) usa template parametrizado.
- **Erros:** o filtro global nunca devolve stack trace; detalhes só no log do servidor.

### Trade-offs aceitos

- **Token em `localStorage`:** simples para uma SPA que fala com uma API separada, mas legível por JavaScript em caso de XSS. Mitigação: Markdown sem HTML cru. Evolução: refresh token em cookie `httpOnly` ([ADR 004](docs/adr/004-autenticacao-jwt.md)).
- **Sem CSP no frontend:** o App Router usa scripts inline e exigiria nonce por requisição — próximo passo.
- **Segredos padrão no compose:** existem só para avaliação local (`JWT_SECRET` padrão é público).
- **`npm audit`:**
  - frontend: **0** vulnerabilidades nas dependências de produção;
  - backend: 4 *high* (`mysql2`, `deepmerge-ts`) vindas do **CLI do Prisma**, que o `@prisma/client` 7 declara como dependência. O CLI só executa `migrate deploy` contra o Postgres no start; a aplicação usa o adapter `pg` e nunca o `mysql2`. A correção sugerida pelo npm é rebaixar para o Prisma 6 → risco aceito;
  - demais alertas (`tmp`, `undici`, `braces`) estão apenas em ferramentas de desenvolvimento.

---

## Testes

**API** (precisa do banco: `docker compose up -d db` e `backend/.env` a partir do `.env.example`):

```bash
cd backend
npm ci
npm run db:deploy && npm run db:seed
npm run lint && npm run typecheck
npm test           # unitários (regras de negócio: árvore, ciclo, versão/409, auth, busca, erros)
npm run test:e2e   # e2e com supertest contra o banco (cria e apaga os próprios dados)
```

**Frontend:**

```bash
cd frontend
npm ci
npm run lint
npm test           # helpers puros com o test runner nativo do Node (árvore, TOC, redirect seguro, destaque)
npm run build
```

As regras de negócio foram escritas com TDD (teste primeiro). Os e2e cobrem caminho feliz e erros 400/401/404/409/413/429 de cada recurso, incluindo dois saves simultâneos da mesma versão (um 200, outro 409).

### Desenvolvimento local sem Docker para as aplicações

```bash
docker compose up -d db                    # só o banco (porta 5433)
cd backend && cp .env.example .env && npm ci && npm run db:deploy && npm run db:seed && npm run start:dev
cd frontend && npm ci && npm run dev       # http://localhost:3000
```

---

## Premissas

- Leitura é pública; criar, editar e excluir exigem login. Não há perfis: qualquer usuário logado edita qualquer conteúdo.
- Excluir um espaço exclui suas páginas; excluir uma página exclui as subpáginas (sempre com confirmação).
- A página pai precisa estar no mesmo espaço; mover uma página para dentro dela mesma ou de uma subpágina é bloqueado.
- Busca por trecho de texto, sem relevância e sensível a acentos (evolução: full-text com `unaccent`).
- Token com expiração fixa de 8 h e sem refresh token.
- O conteúdo de exemplo é fictício e não representa nenhuma empresa real.

## Próximos passos

- Full-text search (`tsvector` com pesos, `portuguese` + `unaccent`, ranking e trecho destacado pelo banco).
- Benchmark com dezenas de milhares de páginas (`EXPLAIN ANALYZE` antes/depois) e, se medido como gargalo, cache da navegação em Redis.
- Logs estruturados com id de requisição.
- Refresh token em cookie `httpOnly` e CSP com nonce.
- Histórico de versões das páginas e testes E2E de navegador (Playwright).
