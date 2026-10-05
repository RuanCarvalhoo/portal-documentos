# ADR 007 — Histórico de versões das páginas: trigger no banco

**Status:** aceito

## Contexto

Uma página editada perdia o texto anterior para sempre. O desafio lista "histórico de versões de uma página, com visualização de versões anteriores" como diferencial. A página já tem `version` (concorrência otimista, [ADR 005](005-concorrencia-otimista.md)), incrementado a cada gravação.

## Opções consideradas

- **Gravar no código da aplicação** (no `PagesService.update`, na mesma transação) — explícito, mas depende de todo caminho de escrita lembrar de gravar; um `UPDATE` feito por outro caminho (script, seed, migração de dados) passaria sem histórico.
- **Guardar a versão nova a cada gravação** (incluindo a atual) — duplica o texto vigente, que já está em `pages`.
- **Event sourcing** (só eventos de alteração, reconstruir o texto) — poderoso e caro de ler; desproporcional aqui.
- **Trigger no banco guardando o estado anterior** — `BEFORE UPDATE` copia título, conteúdo, autor e data antigos para `page_versions`.

## Decisão

Trigger. `pages_save_version` roda `BEFORE UPDATE OF title, content` com `WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)` e insere `(OLD.id, OLD.version, OLD.title, OLD.content, OLD.updated_by_id, OLD.updated_at)`. A chave é natural: `(page_id, version)`.

- **Atômico**: a versão antiga e a nova gravação entram juntas ou nenhuma; vale para qualquer `UPDATE`, inclusive o do seed.
- **Mover não é editar**: mudar só a página pai não gera versão e não troca o "editada por/em" — senão a versão seguinte seria atribuída a quem só moveu a página.
- **Leitura**: `GET /pages/:id/versions` (paginado, sem conteúdo) e `GET /pages/:id/versions/:version` (com conteúdo), públicas como a página.
- **Restaurar** não é um atalho no banco: abre o editor com o texto antigo, e salvar é uma edição comum (a versão atual vai para o histórico; vale o 409 do ADR 005).

## Consequências

- O SQL do trigger vive numa migration manual: o Prisma não gerencia triggers (nem os vê ao comparar schema e banco).
- Os números de versão podem ter lacunas no histórico (uma movimentação também incrementa `version`).
- O histórico é público e não tem purga: um texto sensível colado e depois apagado continua legível nas versões anteriores — coerente com páginas públicas, mas exigiria uma rota de expurgo num ambiente real.
- Cada edição guarda o texto inteiro (sem diff): simples de ler; o volume só pesaria com páginas enormes e muitas edições.

## Quando eu mudaria de ideia

Com páginas muito grandes e edições frequentes, guardaria diffs (ou comprimiria versões antigas) e criaria uma política de retenção; com requisito de auditoria, registraria também movimentações e exclusões numa tabela de eventos.
