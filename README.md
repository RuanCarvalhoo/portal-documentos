# Portal de Documentação

Portal web para times criarem e organizarem documentação em **páginas Markdown**, agrupadas em **espaços** e organizadas em **árvore**, com **busca** por título e conteúdo, **autenticação JWT** e **histórico de versões**.

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **API:** NestJS 12 + Prisma 7 + PostgreSQL 17
- **Infra:** Docker Compose — um comando sobe banco, API e frontend, com migrations e seed automáticos

---

## Avaliação rápida (5 minutos)

1. `docker compose up --build` e espere os três serviços ficarem *healthy*.
2. Abra http://localhost:3000 e entre com **`demo@example.com` / `demo1234`**.
3. **Arquitetura → Introdução:** Markdown renderizado, sumário, breadcrumb, "criada/editada por". Clique em **Histórico** → versão 1 → **Restaurar esta versão**.
4. **Guias → Guia de Markdown:** títulos, listas, tabela, link, imagem por URL e código com destaque de sintaxe.
5. Busque **markdown** no header.
6. Crie uma subpágina, edite com a pré-visualização ao lado e exclua (há confirmação). Tente sair do editor com texto alterado.
7. **Conflito:** abra a mesma página em duas abas no editor e salve nas duas — a segunda recebe o aviso com "ver a versão atual" e "salvar por cima".
8. http://localhost:3001 abre o **Swagger** (botão *Authorize* para o token).

---

## Como rodar

Pré-requisito: **Docker** (Docker Desktop no Windows/macOS) em execução, com as portas **3000**, **3001** e **5433** livres.

```bash
docker compose up --build
```

O primeiro build sem cache leva alguns minutos (cerca de 8 a 10 numa máquina comum): instala as dependências e compila as duas aplicações.

| O quê | Endereço |
|---|---|
| Portal (frontend) | http://localhost:3000 |
| API (redireciona para o Swagger) | http://localhost:3001 |
| Documentação da API (Swagger) | http://localhost:3001/docs |
| Health check (API + banco) | http://localhost:3001/health |

Para parar: `docker compose down`. Para recomeçar do zero (apaga o banco): `docker compose down -v`.

**O que acontece no `up`:** o `db` só fica *healthy* quando o Postgres aceita conexões; o `backend` aplica as migrations, roda o **seed idempotente** (só cria o conteúdo de exemplo com o banco vazio) e fica *healthy* quando `/health` consulta o banco; o `frontend` sobe depois da API saudável.

### Variáveis de ambiente

Todas têm **padrões de desenvolvimento** no `docker-compose.yml`: nada precisa ser configurado para avaliar. Os segredos padrão são **públicos** — em qualquer outro ambiente, defina os seus (a API avisa no log quando sobe com eles).

| Variável | Padrão | Uso |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `portal-documentos` | Banco (montam o `DATABASE_URL` da API; evite `@ : / # ?` na senha) |
| `JWT_SECRET` | segredo de desenvolvimento | Assinatura dos tokens (mínimo 32 caracteres, validado no boot) |
| `INTERNAL_API_SECRET` | segredo de desenvolvimento | Compartilhado entre frontend e API para repassar o IP do visitante ao rate limit ([detalhes](docs/seguranca.md#rate-limit)) |
| `CORS_ORIGIN` | `http://localhost:3000` | Única origem autorizada a chamar a API |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL da API vista pelo navegador (embutida no build do frontend) |

---

## O que foi pedido → onde ver

| Requisito | Onde ver |
|---|---|
| Espaços: criar, listar, editar, excluir | Home (**Novo espaço**, lista paginada); página do espaço (**Editar**, **Excluir**) |
| Páginas com título, conteúdo, espaço e datas | Qualquer página: **Editar**, **Subpágina**, **Excluir**; "Criada por … · Editada por …" |
| Hierarquia e árvore na navegação | Barra lateral (todas as árvores, recolhíveis); campo **Página pai** no editor; breadcrumb |
| Markdown com pré-visualização | Editor: texto e preview lado a lado (abas no celular) |
| Leitura de títulos, listas, tabelas, links, imagens por URL e código | **Guias → Guia de Markdown** |
| Busca por título e conteúdo | Campo no header → `/search` (paginada, trecho com o termo destacado) |
| Cadastro, login, escrita só autenticada, autoria | **Entrar / Criar conta**; sem login os botões somem e a API responde 401 |
| Validações no front e no back, confirmação ao excluir | Formulários (mensagens por campo + erros da API); `confirm` antes de excluir |
| Um comando, Dockerfiles, migrations e seed automáticos | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |
| API REST com status corretos e erros centralizados | Swagger; [formato de erro](#api) |

### Diferenciais

| Diferencial | Situação |
|---|---|
| Histórico de versões | **Entregue** — histórico por página, visualização e restauração ([ADR 007](docs/adr/007-historico-de-versoes.md)) |
| Índice automático da página | **Entregue** — "Nesta página", gerado dos títulos |
| Layout responsivo e modo escuro | **Entregue** — barra lateral vira gaveta no celular; botão de tema no header |
| Healthcheck dos serviços | **Entregue** — nos três serviços do compose |
| Paginação nas listagens | **Entregue** — espaços, busca e histórico (`{ data, meta }`) |
| Testes no front-end ou e2e | **Parcial** — 34 testes do frontend (lógica pura) e 61 e2e da API; sem e2e de navegador |
| Logs estruturados | Não entregue |
| Upload de imagens, tags, perfis de acesso | Não entregues (imagens por URL; qualquer usuário logado edita) |

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

Dentro do Docker, os containers se encontram pelo **nome do serviço**; o navegador só enxerga as portas publicadas no host. Por isso o frontend usa **duas URLs** da API: a interna para renderizar no servidor e a pública para as chamadas do navegador.

```
backend/
  prisma/       schema, migrations (incl. SQL manual: pg_trgm e trigger do histórico), seed
  src/          auth, spaces, pages (árvore, concorrência, histórico), search, health,
                common (erros, paginação, rate limit), config (validação do ambiente)
  test/         e2e (supertest contra o banco)
frontend/src/
  app/          rotas: /, /spaces/…, /pages/… (incl. /versions), /search, /login, /register
  components/   shell (header, barra lateral), Markdown, editor, formulários
  lib/          cliente da API e lógica pura testada
docs/           ADRs, banco de dados, segurança
```

## Stack e decisões

| Tema | Escolha | Por quê |
|---|---|---|
| Banco | **PostgreSQL 17** | Dados relacionais com integridade e cascade no banco; busca por substring indexada sem infraestrutura extra. [ADR 001](docs/adr/001-banco-de-dados-postgresql.md) |
| ORM | **Prisma 7** | Schema declarativo, migrations versionadas, tipos gerados (driver adapter `pg`). |
| Árvore | **Lista de adjacência** | Mover é um `UPDATE`; todas as árvores saem em 1 query, montadas em O(n). [ADR 002](docs/adr/002-modelagem-da-arvore.md) |
| Busca | **`ILIKE` + GIN `pg_trgm`** | Acha trechos de palavras em título e conteúdo, com índice. [ADR 003](docs/adr/003-busca-trigram.md) |
| Autenticação | **JWT HS256** + guard próprio, **bcryptjs** | Sem sessão no servidor; bcryptjs é JS puro (sem toolchain nativa no Alpine). [ADR 004](docs/adr/004-autenticacao-jwt.md) |
| Concorrência | **Otimista** (`version`) | Uma edição não apaga outra, sem lock. [ADR 005](docs/adr/005-concorrencia-otimista.md) |
| Cache | **Não cachear por enquanto** | A navegação já é barata por desenho; cache só com medição. [ADR 006](docs/adr/006-cache-da-navegacao.md) |
| Histórico | **Trigger no Postgres** | Guarda o texto anterior atomicamente, em qualquer escrita. [ADR 007](docs/adr/007-historico-de-versoes.md) |
| Frontend | **Next.js App Router** | Leitura renderizada no servidor; formulários como Client Components. |
| Markdown | **react-markdown** + remark-gfm + rehype-slug + rehype-highlight | Sem HTML cru (seguro por padrão); o mesmo componente na leitura, no preview e no histórico. |
| Estilo | **Tailwind CSS 4** + typography | Tokens de cor com tema claro/escuro, sem biblioteca de componentes. |

Modelo de dados, índices e migrations: [docs/banco-de-dados.md](docs/banco-de-dados.md).

---

## API

Documentação interativa em **http://localhost:3001/docs**.

| Método | Rota | Auth | Respostas |
|---|---|---|---|
| POST | `/auth/register` | — | 201, 400, 409 (e-mail em uso), 429 |
| POST | `/auth/login` | — | 200, 400, 401 (genérico), 429 |
| GET | `/auth/me` | ✔ | 200, 401 |
| GET | `/spaces?page&limit` | — | 200 `{ data, meta }`, 400 |
| POST | `/spaces` | ✔ | 201, 400, 401, 429 |
| GET / PATCH / DELETE | `/spaces/:id` | PATCH/DELETE ✔ | 200 / 200 / 204, 400, 401, 404, 429 |
| POST | `/spaces/:spaceId/pages` | ✔ | 201, 400 (pai inválido, mais de 10 níveis), 401, 404, 429 |
| GET / PATCH / DELETE | `/pages/:id` | PATCH/DELETE ✔ | 200 / 200 / 204, 400 (ciclo, profundidade), 401, 404, **409** (versão desatualizada), 429 |
| GET | `/pages/:id/versions?page&limit` | — | 200 `{ data, meta }` (sem conteúdo), 400, 404 |
| GET | `/pages/:id/versions/:version` | — | 200, 400, 404 |
| GET | `/navigation` | — | 200 — todos os espaços com suas árvores |
| GET | `/search?q&page&limit` | — | 200, 400 (termo inválido), 429 |
| GET | `/health` | — | 200, 503 |

Todo erro sai no mesmo formato, em português. `message` é um texto ou, em erros de validação, a lista de problemas:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["Informe o nome do espaço"], "path": "/spaces", "timestamp": "…" }
```

---

## Testes

| Camada | O que garante | Quantidade |
|---|---|---|
| Unitários da API (Jest, Prisma simulado) | Regras de negócio: árvore, ciclo e profundidade, versão/409, autenticação, busca e trecho, mapeamento de erros, validação do ambiente, IP do rate limit | 114 (88–100% das linhas dos services de domínio e utilitários) |
| e2e da API (supertest + Postgres real) | Todas as rotas no caminho feliz e nos erros relevantes (400, 401, 404, 409); 413; 429 no login e nas escritas; saves simultâneos (um 200, outro 409); histórico gravado pelo trigger; rate limit por cliente | 61 |
| Frontend (`node --test`) | Lógica pura: árvore, sumário, redirect seguro, destaque, paginação, aviso de texto não salvo, cliente da API, IP repassado | 34 |

O comportamento de interface (edição, conflito, sessão expirada, histórico, gaveta no celular) foi verificado manualmente no navegador; testes e2e de navegador estão nos próximos passos. As regras de negócio foram escritas com o teste junto.

```bash
cd backend                     # precisa do banco e do backend/.env (ver abaixo)
npm ci && npm run db:deploy
npm run lint && npm run typecheck && npm test && npm run test:e2e

cd frontend
npm ci && npm run lint && npm test && npm run build
```

> Os e2e usam o banco do `DATABASE_URL` e apagam ao final os dados que criaram (espaços com nome `E2E …` e usuários `e2e-…`). Rode-os num banco de desenvolvimento.

### Desenvolvimento sem Docker para as aplicações

Requer **Node 24**.

```bash
docker compose up -d db              # só o banco (porta 5433)
cd backend && cp .env.example .env && npm ci && npm run db:deploy && npm run db:seed && npm run start:dev
```

Em outro terminal:

```bash
cd frontend && npm ci && npm run dev   # http://localhost:3000
```

---

## Segurança

- Validação de toda entrada (campos fora do DTO viram 400), ids normalizados, limites de tamanho, erros sem stack trace.
- Senhas com bcrypt; login sem revelar contas; JWT com algoritmo fixo e segredo validado no boot.
- Rate limit por cliente em login, cadastro, busca e escritas — inclusive para leituras renderizadas pelo Next, que repassa o IP do visitante com um segredo compartilhado.
- Markdown sem HTML cru; redirect após login só para caminhos internos; headers de segurança na API e no frontend.
- Portas só em `127.0.0.1`; containers sem root.

Detalhes, premissas de implantação, trade-offs e a triagem do `npm audit`: [docs/seguranca.md](docs/seguranca.md).

---

## Premissas

- Leitura é pública (inclusive o histórico); criar, editar e excluir exigem login. Não há perfis: qualquer usuário logado edita qualquer conteúdo.
- Excluir um espaço exclui suas páginas; excluir uma página exclui as subpáginas e o histórico delas (sempre com confirmação).
- A página pai precisa estar no mesmo espaço; a árvore tem no máximo 10 níveis.
- Mover uma página não é uma edição: não gera versão nem muda o "editada por".
- Busca por trecho de texto, sem relevância e sensível a acentos.
- Token com expiração de 8 h, sem refresh token.
- Em produção, um proxy reverso na frente do frontend acrescenta ou sobrescreve o `X-Forwarded-For` ([por quê](docs/seguranca.md#rate-limit)).
- O conteúdo de exemplo é fictício e não representa nenhuma empresa real.

## Convenções

Código, testes e mensagens de commit em inglês; interface, mensagens da API, comentários e documentação em português. Commits convencionais (`tipo(escopo): resumo`, com escopos `api`, `web`, `db`, `docker`, `deps` e `docs`) e uma branch por mudança, integrada por PR.

## Próximos passos

- Testes e2e de navegador (Playwright) para os fluxos principais.
- Logs estruturados com id de requisição.
- Full-text search (`tsvector` com pesos, `portuguese` + `unaccent`, ranking).
- Benchmark com dezenas de milhares de páginas e, se medido como gargalo, cache da navegação em Redis.
- Refresh token em cookie `httpOnly` e CSP com nonce.
