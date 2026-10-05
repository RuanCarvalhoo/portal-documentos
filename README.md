# Portal de Documentação

Portal web para times criarem e organizarem documentação em **páginas Markdown**. As páginas ficam agrupadas em **espaços** e organizadas em **árvore**, com:

- **busca** por título e conteúdo e **histórico de versões**;
- **tags** e **upload de imagens**;
- **autenticação JWT** com **perfis de acesso** (Admin, Editor e Leitor);
- **logs estruturados**.

O conteúdo do portal é a **documentação deste projeto**: arquitetura, decisões e guias, com os diagramas.

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **API:** NestJS 12 + Prisma 7 + PostgreSQL 17
- **Infra:** Docker Compose: um comando sobe banco, API e frontend, com migrations e seed automáticos

---

## Como rodar

Pré-requisito: **Docker** (Docker Desktop no Windows/macOS) em execução, com as portas **3000**, **3001** e **5433** livres. O compose usa *build contexts* nomeados (Docker Compose v2.17 ou mais novo).

```bash
docker compose up --build
```

O primeiro build sem cache leva alguns minutos (cerca de 8 a 10 numa máquina comum): instala as dependências e compila as duas aplicações.

| O quê | Endereço |
|---|---|
| Portal (frontend) | http://localhost:3000 (também funciona por http://127.0.0.1:3000) |
| API (redireciona para o Swagger) | http://localhost:3001 |
| Documentação da API (Swagger) | http://localhost:3001/docs |
| Health check (API + banco) | http://localhost:3001/health |

Para parar: `docker compose down`. Para recomeçar do zero (apaga o banco): `docker compose down -v`.

**O que acontece no `up`:**

1. O `db` só fica *healthy* quando o Postgres aceita conexões.
2. O `backend` aplica as migrations e roda o **seed idempotente**:
   - sempre garante as contas de demonstração;
   - só num banco sem espaços, importa a documentação de `docs/` (Markdown e diagramas).

   Ele fica *healthy* quando `/health` consegue consultar o banco.
3. O `frontend` sobe depois da API saudável.

### Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `demo@example.com` | `demo1234` |
| Editor | `editor@example.com` | `editor1234` |
| Leitor | `leitor@example.com` | `leitor1234` |

Contas criadas pelo cadastro entram como **Leitor**.

### Variáveis de ambiente

Todas têm **padrões de desenvolvimento** no `docker-compose.yml`: nada precisa ser configurado para avaliar. Os segredos padrão são **públicos**. Em qualquer outro ambiente, defina os seus (a API avisa no log quando sobe com eles).

| Variável | Padrão | Uso |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `portal-documentos` | Banco (montam o `DATABASE_URL` da API; evite `@ : / # ?` na senha) |
| `JWT_SECRET` | segredo de desenvolvimento | Assinatura dos tokens (mínimo 32 caracteres, validado no boot) |
| `INTERNAL_API_SECRET` | segredo de desenvolvimento | Opcional (se definido, mínimo 32 caracteres). Compartilhado entre frontend e API para repassar o IP do visitante ao rate limit ([detalhes](docs/seguranca.md#rate-limit)) |
| `LOG_LEVEL` | `info` | Nível mínimo dos logs JSON da API (`fatal` … `trace`, `silent`) |
| `CORS_ORIGIN` | `http://localhost:3000` | Origem liberada para clientes que chamem a API direto. O portal não depende dela: o navegador usa o proxy `/api` |

### Solução de problemas

- **"Não foi possível conectar à API"** no portal: o frontend não alcança a API pela rede interna.
  - Veja `docker compose ps` (o `backend` está *healthy*?) e `docker compose logs backend`. Uma migration ou o seed com erro impedem a API de subir.
  - O navegador não chama a porta 3001 diretamente ([ADR 008](docs/adr/008-proxy-da-api-no-frontend.md)), então CORS e o host usado para abrir o portal não interferem.
- **Conteúdo antigo** (o exemplo fictício de versões anteriores): rode `docker compose down -v` e suba de novo. O seed só importa a documentação num banco vazio.
- **Porta ocupada:** libere 3000, 3001 e 5433, ou mude o lado do host em `ports` no `docker-compose.yml`.

---

## Como testar

1. **Suba o projeto:** `docker compose up --build` e espere os três serviços ficarem *healthy* (`docker compose ps` em outro terminal).
   - Se já rodou uma versão anterior, comece com `docker compose down -v`: o seed só cria o conteúdo num banco sem espaços.
2. **Entre:** abra http://localhost:3000 e entre como Admin com **`demo@example.com` / `demo1234`**.
3. **Leia a arquitetura:** em **Arquitetura → Visão geral**, veja o diagrama (clique para ampliar), o sumário, as tags e o "criada/editada por".
   - Clique em **Histórico** → **versão 1**, a versão anterior com o diagrama em texto, e em **Restaurar esta versão**.
4. **Veja os pontos de falha:** **Operação → Pontos de falha e escalabilidade** mostra o que acontece quando cada peça cai, os gargalos e como o sistema cresce.
5. **Navegue por tags:** clique em **#postgresql** em qualquer página, ou abra **Tags** na barra lateral.
6. **Busque** **markdown** no header.
7. **Edite uma página:** crie uma subpágina e, no editor:
   - acrescente tags;
   - **cole um print** ou use **Inserir imagem**;
   - veja a pré-visualização ao lado;
   - salve, depois exclua (há confirmação).
8. **Teste um conflito:** abra o editor da mesma página em duas abas, altere o texto nas duas e salve uma depois da outra. A segunda recebe o aviso, com "ver a versão atual" e "salvar por cima".
9. **Teste os perfis:**
   - Entre como **`leitor@example.com` / `leitor1234`**: os botões de edição somem, e a API responde 403.
   - Volte como Admin, abra **Usuários** no header e promova o Leitor a Editor.
   - Tente rebaixar a única conta Admin: o portal impede.
10. **Veja os logs:** `docker compose logs backend` mostra uma linha JSON por requisição, com o `requestId` (o mesmo que volta no corpo de qualquer erro).
11. **Abra o Swagger** em http://localhost:3001: `POST /auth/login` com o usuário demo, copie o `accessToken` e cole em **Authorize**.

---

## Arquitetura

![Visão geral: navegador, frontend, backend e banco no docker compose](docs/diagramas/01-visao-geral.png)

O navegador só fala com o frontend. As páginas de leitura são renderizadas no servidor do Next, que busca os dados na API pela rede interna. Formulários e login chamam `/api/...` na própria origem, e o Next repassa para a API ([ADR 008](docs/adr/008-proxy-da-api-no-frontend.md)). Por isso não há CORS nem URL da API embutida no build.

A documentação completa está em [`docs/`](docs/), e é ela que aparece dentro do portal:

| Documento | Conteúdo |
|---|---|
| [Visão geral](docs/arquitetura/visao-geral.md) | As peças, como uma requisição passa, tecnologias e por quê, onde está cada coisa |
| [Backend](docs/arquitetura/backend.md) | O caminho de uma requisição na API (logs, guards, validação, controller, service, Prisma) e os módulos |
| [Frontend](docs/arquitetura/frontend.md) | O que roda no servidor e o que roda no navegador; sessão, editor e Markdown |
| [Fluxos principais](docs/arquitetura/fluxos.md) | Salvar com concorrência otimista, upload de imagem, login, leitura e busca |
| [Banco de dados](docs/banco-de-dados.md) | Modelo de dados, índices, trigger e migrations |
| [Observabilidade e logs](docs/arquitetura/observabilidade.md) | Formato do log, `requestId` de ponta a ponta, consultas com `jq` |
| [Pontos de falha e escalabilidade](docs/arquitetura/escalabilidade.md) | O que acontece quando cada peça falha, gargalos, como contornar e como escala |
| [Segurança](docs/seguranca.md) | Entrada, autenticação, perfis, rate limit, uploads, trade-offs e `npm audit` |
| [Decisões (ADRs)](docs/adr/) | 12 decisões com contexto, alternativas, consequências e quando eu mudaria de ideia |
| [Diagramas](docs/diagramas/) | Fontes `.excalidraw` editáveis e os PNGs |

```
backend/
  prisma/       schema, migrations (com SQL manual: pg_trgm, trigger, storage do bytea), seed (lê docs/)
  src/          auth, users, spaces, pages, tags, uploads, search, health,
                common (erros, paginação, rate limit, logs), config (ambiente validado no boot)
  test/         e2e (supertest contra o banco)
frontend/src/
  app/          rotas: /, /spaces, /pages (+ /versions), /tags, /search, /admin/usuarios,
                /login, /register e o proxy /api/[...path]
  components/   shell (header, barra lateral), Markdown, editor, tags, formulários
  lib/          cliente da API, proxy, permissões, tags, uploads: lógica pura testada
docs/           arquitetura, ADRs, guias e diagramas: o conteúdo do portal
```

## Stack e decisões

| Tema | Escolha | Por quê |
|---|---|---|
| Banco | **PostgreSQL 17** | Dados relacionais com integridade e cascade no banco; busca por substring indexada sem infraestrutura extra. [ADR 001](docs/adr/001-banco-de-dados-postgresql.md) |
| ORM | **Prisma 7** | Schema declarativo, migrations versionadas, tipos gerados (driver adapter `pg`). |
| Árvore | **Lista de adjacência** | Mover é um `UPDATE`; a navegação inteira sai em 2 queries (espaços e páginas, sem o conteúdo), montada em O(n). [ADR 002](docs/adr/002-modelagem-da-arvore.md) |
| Busca | **`ILIKE` + GIN `pg_trgm`** | Acha trechos de palavras em título e conteúdo, com índice. [ADR 003](docs/adr/003-busca-trigram.md) |
| Autenticação | **JWT HS256** + guard próprio, **bcryptjs** | Sem sessão no servidor; bcryptjs é JS puro (sem toolchain nativa no Alpine). [ADR 004](docs/adr/004-autenticacao-jwt.md) |
| Concorrência | **Otimista** (`version`) | Uma edição não apaga outra, sem lock. [ADR 005](docs/adr/005-concorrencia-otimista.md) |
| Cache | **Não cachear por enquanto** | A navegação já é barata por desenho; cache só com medição. [ADR 006](docs/adr/006-cache-da-navegacao.md) |
| Histórico | **Trigger no Postgres** | Guarda o texto anterior atomicamente, em qualquer escrita. [ADR 007](docs/adr/007-historico-de-versoes.md) |
| Navegador → API | **Proxy `/api` no Next** (Route Handler) | Mesma origem: sem CORS, sem URL da API no build, sem depender da porta 3001 no navegador. [ADR 008](docs/adr/008-proxy-da-api-no-frontend.md) |
| Logs | **pino** (`nestjs-pino`) | JSON em stdout, `requestId` do proxy até a API, sem headers nem query string. [ADR 009](docs/adr/009-logs-estruturados.md) |
| Imagens | **`bytea` no Postgres** | Nenhuma peça nova no compose e qualquer réplica serve qualquer imagem; o caminho para S3 + CDN está descrito. [ADR 010](docs/adr/010-armazenamento-de-imagens.md) |
| Tags | **`tags` + `page_tags`** | Nome canônico único, contagem por tag com índice. [ADR 011](docs/adr/011-tags.md) |
| Perfis | **Admin, Editor, Leitor** | Perfil global lido do banco a cada requisição: promover ou rebaixar vale na hora. [ADR 012](docs/adr/012-perfis-de-acesso.md) |
| Frontend | **Next.js App Router** | Leitura renderizada no servidor; formulários como Client Components. |
| Markdown | **react-markdown** + remark-gfm + rehype-slug + rehype-highlight | Sem HTML cru (seguro por padrão); o mesmo componente na leitura, no preview e no histórico. |
| Estilo | **Tailwind CSS 4** + typography | Tokens de cor com tema claro/escuro, sem biblioteca de componentes. |
| Diagramas | **Excalidraw** | Fonte editável versionada junto do PNG; o seed envia os PNGs ao portal. |

---

## API

Documentação interativa em **http://localhost:3001/docs**. No portal, o navegador chama as mesmas rotas com o prefixo `/api` (proxy do Next).

| Método | Rota | Perfil | Respostas |
|---|---|---|---|
| POST | `/auth/register` | — | 201 (conta Leitor), 400, 409 (e-mail em uso), 429 |
| POST | `/auth/login` | — | 200, 400, 401 (genérico), 429 |
| GET | `/auth/me` | logado | 200, 401 |
| GET | `/users?page&limit` | Admin | 200 `{ data, meta }`, 401, 403 |
| PATCH | `/users/:id/role` | Admin | 200, 400, 401, 403, 404, **409** (último Admin), 429 |
| GET | `/spaces?page&limit` | — | 200 `{ data, meta }`, 400 |
| POST / PATCH | `/spaces`, `/spaces/:id` | Editor | 201 / 200, 400, 401, 403, 404, 429 |
| DELETE | `/spaces/:id` | Admin | 204, 400, 401, 403, 404, 429 |
| GET | `/spaces/:id` | — | 200, 400, 404 |
| POST | `/spaces/:spaceId/pages` | Editor | 201, 400 (pai inválido, mais de 10 níveis, tags), 401, 403, 404, 429 |
| GET / PATCH / DELETE | `/pages/:id` | PATCH/DELETE: Editor | 200 / 200 / 204, 400 (ciclo, profundidade), 401, 403, 404, **409** (versão desatualizada), 429 |
| GET | `/pages/:id/versions?page&limit` | — | 200 `{ data, meta }` (sem conteúdo), 400, 404 |
| GET | `/pages/:id/versions/:version` | — | 200, 400, 404 |
| GET | `/navigation` | — | 200: todos os espaços com suas árvores |
| GET | `/tags?page&limit` | — | 200 `{ data: [{ name, pageCount }], meta }` |
| GET | `/tags/:nome/pages?page&limit` | — | 200 `{ data, meta }`, 400 (tag inválida), 404 |
| POST | `/uploads` (multipart, campo `file`) | Editor | 201 `{ id, path, … }`, 400, 401, 403, **413** (> 5 MB), **415** (não é PNG/JPEG/GIF/WebP), 429 |
| GET | `/uploads/:id` | — | 200 (cache imutável + ETag), 304, 400, 404 |
| GET | `/search?q&page&limit` | — | 200, 400 (termo inválido), 429 |
| GET | `/health` | — | 200, 503 |

Todo erro sai no mesmo formato, em português. `message` é um texto ou, em erros de validação, a lista de problemas. `requestId` é o mesmo dos logs daquela requisição:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["Informe o nome do espaço"], "path": "/spaces", "requestId": "…", "timestamp": "…" }
```

---

## Testes

| Camada | O que garante | Quantidade |
|---|---|---|
| Unitários da API (Jest, Prisma simulado) | Regras de negócio: árvore, ciclo e profundidade, versão/409, tags, perfis e último Admin, autenticação e 403, busca e trecho, assinatura das imagens, mapeamento de erros, logs (id da requisição), validação do ambiente, IP do rate limit, transformação dos documentos do seed | 163 |
| e2e da API (supertest + Postgres real) | Todas as rotas no caminho feliz e nos erros relevantes (400, 401, 403, 404, 409, 413, 415); 429 no login e nas escritas; saves simultâneos (um 200, outro 409); histórico gravado pelo trigger; perfis (promoção imediata, último Admin, conta removida); tags; upload, deduplicação e ETag; `requestId` | 82 |
| Frontend (`node --test`) | Lógica pura: árvore, sumário, redirect seguro, destaque, paginação, aviso de texto não salvo, cliente da API, proxy (URL de destino e allowlist de cabeçalhos), permissões, tags, inserção de imagens, IP repassado | 53 |

O comportamento de interface (edição, conflito, sessão expirada, histórico, gaveta no celular, perfis, tags e upload) foi verificado no navegador com scripts Playwright durante o desenvolvimento; não há uma suíte e2e de navegador no repositório. As regras de negócio foram escritas com o teste junto.

```bash
cd backend                     # precisa do banco e do backend/.env (ver abaixo)
npm ci && npm run db:deploy
npm run lint && npm run typecheck && npm test && npm run test:e2e

cd ../frontend
npm ci && npm run lint && npm test && npm run build
```

> Os e2e usam o banco do `DATABASE_URL` e apagam ao final os dados que criaram (espaços com nome `E2E …`, usuários `e2e-…`, as tags e as imagens deles). Rode-os num banco de desenvolvimento.

### Desenvolvimento sem Docker para as aplicações

Requer **Node 24**. Se o stack completo estiver de pé, libere as portas antes: `docker compose stop backend frontend`.

```bash
docker compose up -d db              # só o banco (porta 5433)
cd backend && cp .env.example .env && npm ci && npm run db:deploy && npm run db:seed && npm run start:dev
```

Em outro terminal:

```bash
cd frontend && npm ci && npm run dev   # http://localhost:3000 (API em http://localhost:3001)
```

Fora do Docker, o seed lê a documentação direto de `../docs`, e os logs da API saem formatados (`LOG_PRETTY=true` no `.env`).

---

## Segurança

- Validação de toda entrada (campos fora do DTO viram 400), ids normalizados, limites de tamanho, erros sem stack trace.
- Senhas com bcrypt; login sem revelar contas; JWT com algoritmo fixo e segredo validado no boot.
- Perfis lidos do banco a cada requisição: escrever exige Editor, excluir espaços e gerenciar perfis exige Admin, e o cadastro não escolhe perfil.
- Upload com tipo conferido pelos bytes, sem SVG, com teto de 5 MB e só depois da autenticação.
- Rate limit por cliente em login, cadastro, busca, uploads e escritas. As chamadas chegam à API pelo servidor do Next, que repassa o IP do visitante com um segredo compartilhado (sem isso, todos dividiriam o mesmo limite).
- Markdown sem HTML cru; redirect após login só para caminhos internos; headers de segurança na API e no frontend; logs sem token, segredo ou termos de busca.
- Portas só em `127.0.0.1`; API e frontend rodam sem root.

Detalhes, premissas de implantação, trade-offs e a triagem do `npm audit`: [docs/seguranca.md](docs/seguranca.md).

---

## Premissas

- **Acesso:**
  - Leitura é pública (inclusive o histórico, as tags e as imagens).
  - Criar e editar exigem o perfil Editor; excluir espaços e gerenciar perfis, Admin.
  - Conta nova entra como Leitor ([ADR 012](docs/adr/012-perfis-de-acesso.md)).
- **Exclusão:**
  - Excluir um espaço exclui suas páginas.
  - Excluir uma página exclui as subpáginas e o histórico delas.
  - Toda exclusão tem confirmação.
- **Árvore:** a página pai precisa estar no mesmo espaço, e a árvore tem no máximo 10 níveis.
- **Metadados e histórico:**
  - Mover uma página ou trocar as tags não é uma edição: não gera versão nem muda o "editada por".
  - O histórico guarda título e conteúdo, não as tags.
- **Imagens:**
  - Uma imagem apagada do texto continua guardada (sem limpeza automática de órfãs).
  - O mesmo arquivo enviado duas vezes é guardado uma só.
- **Busca:** por trecho de texto, sem relevância e sensível a acentos.
- **Sessão:** token com expiração de 8 h, sem refresh token.
- **Produção:** um proxy reverso na frente do frontend acrescenta o IP da conexão ao `X-Forwarded-For` ([por quê](docs/seguranca.md#rate-limit)).
- **Conteúdo:** o conteúdo do portal é a própria documentação do projeto (`docs/`), importada pelo seed.

## Convenções

Código, testes e mensagens de commit em inglês; interface, mensagens da API, comentários e documentação em português. Commits convencionais (`tipo(escopo): resumo`, com escopos como `api`, `web`, `db`, `docker` e `deps`) e uma branch por mudança, integrada por PR.
