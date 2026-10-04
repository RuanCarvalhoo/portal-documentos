# ADR 002 — Modelagem da hierarquia de páginas

**Status:** aceito

## Contexto

Páginas formam uma árvore dentro de cada espaço (página → subpáginas, sem limite fixo de níveis). A leitura mais frequente do portal é a barra lateral, que mostra **todos os espaços com suas árvores** em toda página renderizada. Escritas são raras em comparação: criar, mover ou excluir páginas.

## Opções consideradas

- **Lista de adjacência** (`parent_id`) — uma FK por página; mover uma subárvore é um único `UPDATE`.
- **Materialized path / `ltree`** — consultas de subárvore muito rápidas, mas mover uma página reescreve o caminho de todos os descendentes.
- **Closure table** — consultas de ancestrais/descendentes em O(1) query, mas uma tabela extra com O(n·profundidade) linhas a manter em toda escrita.
- **Nested sets** — leitura de subárvore rápida, mas inserções e movimentos reescrevem boa parte da tabela.

## Decisão

Lista de adjacência: `pages.parent_id` (nulo na raiz) com `ON DELETE CASCADE`, mais `position` para ordenar irmãos. A árvore é lida em **uma query** (`id, title, parent_id, position` do espaço, **sem `content`**) e montada em memória com um `Map` em O(n) — sem N+1. O índice composto `(space_id, parent_id, position)` atende essa query e, pelo prefixo à esquerda, também buscas só por `space_id`.

## Consequências

- Escritas simples e baratas: mover uma página é trocar o `parent_id`.
- Regras que o banco não garante sozinho ficam no service: o pai deve estar no mesmo espaço, e mover uma página para dentro de um descendente (ciclo) é bloqueado subindo a cadeia de pais.
- Se precisar, `WITH RECURSIVE` resolve ancestrais e descendentes direto no SQL.

## Quando eu mudaria de ideia

Se as árvores ficassem muito profundas/grandes e consultas de subárvore (ex.: "todas as páginas abaixo de X") virassem a operação dominante, eu migraria para `ltree` ou closure table, aceitando escritas mais caras.
