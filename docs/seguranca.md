# Segurança

Resumo no [README](../README.md#segurança). Aqui ficam os detalhes, as premissas de implantação e a triagem do `npm audit`.

## Entrada e erros

- `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted`: campo fora do DTO vira 400 (sem *mass assignment*).
- Ids validados como UUID antes de chegar ao banco e **normalizados para minúsculas** (as checagens de ciclo e de profundidade comparam ids como texto).
- Limites em todos os textos (título 200, conteúdo 50 mil caracteres, nome do espaço 100, descrição 500) e no corpo da requisição (100 KB → 413).
- Texto com byte NUL (`\u0000`, que o Postgres não aceita) responde 400, não 500.
- O filtro global de erros responde sempre `{ statusCode, error, message, path, timestamp }`, nunca com stack trace; erros inesperados vão para o log do servidor só com método e caminho (sem query string, que pode ter termos de busca).

## Autenticação e senhas

- Senhas com **bcryptjs** (custo 10) e limite de 72 **bytes** (o limite real do bcrypt); o hash nunca sai da API (`select` explícito).
- Login com 401 genérico e bcrypt executado mesmo para e-mail inexistente: nem a mensagem nem o tempo revelam contas no login. O **cadastro** responde 409 para e-mail já usado (é a mensagem útil para quem se cadastra); o rate limit do cadastro limita a enumeração.
- JWT **HS256** com algoritmo fixo na verificação, `JWT_SECRET` obrigatório (mínimo 32 caracteres, validado no boot) e expiração de 8 h. Token em `localStorage` (ver trade-offs).

## Rate limit

| Rota | Limite por cliente |
|---|---|
| `POST /auth/login`, `POST /auth/register` | 10 por minuto |
| `GET /search` | 30 por minuto |
| Criar, editar e excluir espaços e páginas | 120 por minuto (por rota) |

**Quem é o cliente.** Toda chamada chega à API vinda do servidor do Next: as páginas renderizadas no servidor e também as chamadas do navegador, que passam pelo proxy `/api` ([ADR 008](adr/008-proxy-da-api-no-frontend.md)). Sem tratamento, todo visitante teria o IP do container do frontend, e cada limite valeria para todo mundo junto. Por isso o Next repassa o IP de quem fez a requisição (`x-portal-client-ip`) junto com um segredo compartilhado (`x-portal-proxy-secret` = `INTERNAL_API_SECRET`, comparado em tempo constante). Sem o segredo certo (ou com ele vazio), o cabeçalho é ignorado e vale o IP da conexão. A API não usa `trust proxy`.

**Premissa de implantação.** O IP repassado é o **último** item do `X-Forwarded-For` que o Next recebe. Sem proxy na frente, o Next só preenche esse cabeçalho com o IP da conexão quando ele não vem na requisição. Ou seja, um cliente consegue escolher o IP repassado, inclusive no login e nas escritas. Em produção, o proxy reverso ou balanceador na frente do frontend deve acrescentar o IP da conexão ao `X-Forwarded-For` (`$proxy_add_x_forwarded_for` no nginx). No compose, as portas ficam só em `127.0.0.1`.

## Estrutura das páginas

- Página pai sempre do mesmo espaço; mover para dentro de si mesma ou de uma subpágina é bloqueado.
- Árvore com no máximo **10 níveis** (criar e mover): uma cadeia de milhares de páginas aninhadas estouraria a pilha ao serializar `/navigation` e derrubaria a barra lateral do portal.
- Criar e mover travam a linha do espaço (`SELECT … FOR UPDATE`): mudanças de estrutura simultâneas entram em fila ([ADR 005](adr/005-concorrencia-otimista.md)).

## Frontend

- Markdown renderizado **sem HTML cru** (sem `rehype-raw`); o `urlTransform` padrão descarta links `javascript:` e `data:`; links externos (inclusive `//site.com`) abrem com `noopener noreferrer`.
- Redirect após login só para caminhos internos (testado contra variantes como `/%09/site.com`).
- Leituras feitas no servidor só aceitam ids no formato UUID (um parâmetro como `..%2Fauth%2Fme` não vira outro caminho da API).
- Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; sem `X-Powered-By`.

## API, banco e Docker

- `helmet` na API; CORS restrito a uma origem (`CORS_ORIGIN`, validada como origem exata). O portal não depende de CORS: o navegador só fala com a origem do frontend, e o proxy `/api` repassa uma allowlist de cabeçalhos ([ADR 008](adr/008-proxy-da-api-no-frontend.md)).
- SQL pelo Prisma (parametrizado); os SQL manuais (lock do espaço, health check, advisory lock do seed) usam *tagged templates* parametrizados. `statement_timeout` de 10 s.
- Containers da API e do frontend rodam como usuário `node`, com `no-new-privileges`.
- As portas 3000, 3001 e 5433 ficam só em `127.0.0.1`.

## Trade-offs aceitos

- **Segredos padrão no compose** (`JWT_SECRET`, `INTERNAL_API_SECRET`, senha do banco): existem para o "um comando" funcionar e são **públicos**. Por isso as portas ficam em `127.0.0.1`, e a API avisa no log quando sobe com o `JWT_SECRET` ou o `INTERNAL_API_SECRET` padrão. Em qualquer outro ambiente, defina segredos próprios.
- **Token em `localStorage`:** simples para uma SPA que fala com uma API separada, mas legível por JavaScript em caso de XSS. Mitigação: Markdown sem HTML cru. Evolução: refresh token em cookie `httpOnly` ([ADR 004](adr/004-autenticacao-jwt.md)).
- **Sem CSP no frontend:** o App Router usa scripts inline e exigiria nonce por requisição.
- **Registro aberto e sem perfis:** qualquer conta edita e exclui qualquer conteúdo (premissa do desafio; o rate limit das escritas freia abuso em massa). O histórico de versões guarda o texto anterior de cada edição.
- **Swagger público**, inclusive com `NODE_ENV=production` — é parte da avaliação.

## `npm audit`

- **Frontend:** 0 vulnerabilidades nas dependências de produção.
- **Backend:** 4 *high* — o pacote `prisma` (o CLI, que fica na imagem para o `migrate deploy` do start) e dependências dele (`@prisma/config`, `deepmerge-ts`, `mysql2`). O CLI só aplica migrations no Postgres; a aplicação usa o `@prisma/client` com o adapter `pg` e nunca carrega o `mysql2`. A correção sugerida pelo npm é rebaixar para o Prisma 6 → risco aceito.
- **Frontend, ferramentas de desenvolvimento:** 5 *high* na cadeia do ESLint (`eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, `braces`); não entram na imagem nem no bundle.
