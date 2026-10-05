# ADR 009 — Logs estruturados: JSON com pino e id de requisição

**Status:** aceito

## Contexto

A API registrava só o boot e os erros 500, em texto livre no formato do `ConsoleLogger` do Nest. Não havia log de acesso nem como ligar um erro visto pelo usuário à linha do servidor. Com mais de uma instância, também não dava para juntar e filtrar os logs num coletor (Loki, CloudWatch, ELK).

## Opções consideradas

- **`ConsoleLogger` do Nest com `json: true`** — já vem no framework, mas não tem log de acesso nem contexto por requisição. Seria preciso escrever um middleware e repassar o id da requisição à mão em cada chamada.
- **winston (`nest-winston`)** — flexível, mas mais lento, e o contexto por requisição também fica por nossa conta.
- **pino (`nestjs-pino` + `pino-http`)** — JSON por padrão, rápido (serialização assíncrona), log de acesso pronto e contexto da requisição via `AsyncLocalStorage`: qualquer `Logger` do Nest chamado durante a requisição já leva o id dela.

## Decisão

pino, configurado em `backend/src/common/logging.ts`:

- **Uma linha JSON por evento** em stdout, com `level` (texto), `time` (ISO), `service` e `hostname` (identifica a réplica) e `msg`. O destino dos logs fica a cargo da infraestrutura: `docker compose logs`, um agente de coleta etc.
- **Id da requisição:** a API aceita o `x-request-id` enviado pelo proxy do frontend ([ADR 008](008-proxy-da-api-no-frontend.md)) se ele tiver um formato seguro; senão, gera um UUID. O id volta no header da resposta e no envelope de erro (`requestId`). O mesmo id aparece no log do Next, no log de acesso da API e nos eventos de negócio.
- **Log de acesso** ao fim de cada requisição: método, caminho, status, duração, `userId` (quando autenticada) e `clientIp` (o mesmo do rate limit). O nível depende do status: 5xx → `error`, 4xx → `warn`, o resto → `info`.
- **Eventos de negócio** nos services, com campos próprios: `space.created`, `page.updated` (com `version`, `textChanged`, `moved`), `user.registered`, `user.role_changed`, `upload.created` etc.
- **Fora do log:** headers (token, segredo do proxy), query string (pode ter termos de busca), e-mail e corpo das requisições. O `/health` também fica fora: o healthcheck o chama a cada 5 s e ocuparia metade do log.
- **Configuração:** `LOG_LEVEL` (validado no boot) e `LOG_PRETTY=true` no `.env` de desenvolvimento, para ler no terminal com `pino-pretty`. Nos testes, o nível é `silent`.

## Consequências

- Um erro reportado pelo usuário chega com o `requestId`, e `docker compose logs backend | grep <id>` mostra a requisição inteira: acesso, evento e stack.
- Logs prontos para qualquer coletor que leia JSON, sem parser.
- O log de acesso vira a base para métricas simples (taxa de 5xx, latência por rota) até existir uma instrumentação de verdade.
- As mensagens do boot do Nest (`RouterExplorer` etc.) também saem em JSON, em `info`. Com `LOG_LEVEL=warn` elas somem, mas o log de acesso das respostas 2xx também.

## Quando eu mudaria de ideia

Com várias instâncias em produção, eu acrescentaria **OpenTelemetry**: traces distribuídos (Next → API → Postgres) com o `trace_id` nos logs, no lugar do `requestId` próprio, e métricas (p95 por rota, conexões do pool) exportadas para Prometheus/Grafana.
