# Observabilidade e logs

A API escreve **uma linha JSON por evento** em stdout, com **pino** via `nestjs-pino`. Coletar, guardar e buscar fica a cargo da infraestrutura: `docker compose logs`, um agente que envia para Loki, CloudWatch ou ELK etc. ([ADR 009](../adr/009-logs-estruturados.md)).

## O que aparece no log

**Acesso:** uma linha ao fim de cada requisição.

```json
{"level":"info","time":"2026-10-05T16:34:08.680Z","service":"api","hostname":"vm","requestId":"b5b87f12-ae03-4328-ad43-46878d00920a","req":{"id":"b5b87f12-ae03-4328-ad43-46878d00920a","method":"POST","path":"/spaces","clientIp":"203.0.113.7"},"userId":"01a10ce0-bfc3-759d-ae70-030a8bafc793","res":{"statusCode":201},"responseTime":13,"msg":"POST /spaces 201 13ms"}
```

**Evento de negócio:** registrado pelo service durante a requisição, com o mesmo `requestId`.

```json
{"level":"info","time":"2026-10-05T16:34:08.679Z","service":"api","hostname":"vm","requestId":"b5b87f12-ae03-4328-ad43-46878d00920a","context":"SpacesService","event":"space.created","spaceId":"01a10cea-5ea4-7019-96ff-c062145b5538","msg":"Espaço criado"}
```

**Erro do cliente:** 4xx sai em `warn`. O mesmo `requestId` volta no corpo da resposta.

```json
{"level":"warn","time":"2026-10-05T16:34:08.447Z","service":"api","hostname":"vm","requestId":"5e255d74-c4bd-45a1-92b5-4ed72c9b60f1","req":{"id":"5e255d74-c4bd-45a1-92b5-4ed72c9b60f1","method":"GET","path":"/pages/00000000-0000-0000-0000-000000000000","clientIp":"203.0.113.7"},"res":{"statusCode":404},"responseTime":10,"msg":"GET /pages/00000000-0000-0000-0000-000000000000 404 10ms"}
```

## Campos

| Campo | Significado |
|---|---|
| `level` | `info`, `warn` (respostas 4xx), `error` (5xx e falhas), `fatal` |
| `time` | ISO 8601, UTC |
| `service`, `hostname` | quem escreveu (`api`, `frontend`) e em qual réplica |
| `requestId` | id da requisição, o mesmo no frontend, na API e no envelope de erro |
| `req.method`, `req.path` | rota, **sem query string** (pode ter termos de busca) |
| `req.clientIp` | o mesmo IP do rate limit: o do visitante, repassado pelo frontend com o segredo compartilhado |
| `userId` | conta autenticada, quando há |
| `res.statusCode`, `responseTime` | status e duração em ms |
| `context`, `event` | quem registrou o evento de negócio e qual foi |

**Eventos registrados:**

| Evento | Campos próprios |
|---|---|
| `user.registered` | `userId` |
| `user.role_changed` | `userId`, `from`, `to`, `changedBy` |
| `space.created`, `space.updated`, `space.deleted` | `spaceId` |
| `page.created` | `pageId`, `spaceId`, `tags` |
| `page.updated` | `pageId`, `version`, `textChanged`, `moved`, `tagsChanged` |
| `page.deleted` | `pageId` |
| `upload.created` | `uploadId`, `mimeType`, `size` |

## O que não vai para o log

- **Cabeçalhos:** o token JWT e o segredo do proxy (`x-portal-proxy-secret`).
- **Query string:** termos de busca.
- **Corpo das requisições e e-mails:** dados pessoais e conteúdo das páginas.
- **`GET /health`:** o healthcheck do compose o chama a cada 5 s e encheria o log.

## O id da requisição, de ponta a ponta

1. O proxy do Next (`/api/*`) gera um UUID, ou reaproveita um `x-request-id` recebido se ele tiver formato seguro (`[A-Za-z0-9_-]`, até 64 caracteres), e o envia à API.
2. A API usa o mesmo id no log de acesso, nos eventos e nos erros, e o devolve no header `x-request-id`.
3. Todo erro da API traz `requestId` no corpo: quem reporta um problema informa o id, e a busca no log mostra a requisição inteira.
4. Se a API estiver fora do ar, o proxy responde 502 com o mesmo `requestId` e escreve a falha no log do frontend, também em JSON:

```json
{"level":"error","time":"2026-10-05T16:27:34.254Z","service":"frontend","msg":"Falha ao repassar a requisição para a API","requestId":"f1d66b4f-fbcd-440a-80ef-9f757e6f2710","method":"POST","path":"/api/auth/login","status":502,"error":"TypeError: fetch failed: connect ECONNREFUSED 127.0.0.1:3001"}
```

## Consultas úteis

```bash
# Tudo de uma requisição (acesso, eventos e erro)
docker compose logs backend --no-log-prefix | jq -c 'select(.requestId == "b5b87f12-ae03-4328-ad43-46878d00920a")'

# Erros do servidor
docker compose logs backend --no-log-prefix | jq -c 'select(.level == "error")'

# Requisições lentas (mais de 500 ms)
docker compose logs backend --no-log-prefix | jq -c 'select(.responseTime > 500) | {msg, requestId}'

# Trilha de auditoria: quem mudou o perfil de quem
docker compose logs backend --no-log-prefix | jq -c 'select(.event == "user.role_changed")'
```

Em desenvolvimento (`npm run start:dev`), `LOG_PRETTY=true` no `.env` mostra as linhas formatadas no terminal (`pino-pretty`). `LOG_LEVEL` controla o nível mínimo; nos testes, ele é `silent`.

## Saúde

`GET /health` consulta o banco (`SELECT 1`) e responde `{ status: 'ok', database: 'up' }` ou 503. O compose usa esse endpoint para decidir quando o frontend pode subir. Um orquestrador (Kubernetes, ECS) usaria o mesmo endpoint como *readiness probe*.

## Próximo passo de maturidade

Com várias réplicas em produção, os logs sozinhos não bastam para enxergar latência entre serviços. Eu acrescentaria **OpenTelemetry** (traces Next → API → Postgres, com o `trace_id` nos logs) e **métricas** (taxa de 5xx, p95 por rota, conexões em uso no pool) com alertas.
