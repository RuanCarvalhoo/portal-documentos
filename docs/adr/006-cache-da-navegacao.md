# ADR 006 — Cache da navegação: adiado até haver medição que o justifique

**Status:** aceito (decisão de **não** cachear por enquanto)

## Contexto

`GET /navigation` (todos os espaços com suas árvores de páginas) é a leitura mais repetida do portal: o layout de toda página a renderiza na barra lateral. É a candidata natural a cache.

## Opções consideradas

- **Cache em memória na API** (cache-aside, chave única, TTL curto + invalidação em toda escrita de espaço/página) — simples, mas fica errado com mais de uma instância da API (cada uma com seu cache) e exige não esquecer nenhuma invalidação.
- **Redis** — cache compartilhado entre instâncias; mais uma peça de infraestrutura para operar.
- **Cache HTTP / Next** (ETag, `revalidateTag`) — reaproveita o protocolo; com dados que mudam a cada edição e páginas renderizadas por requisição, a invalidação vira o problema principal.
- **Não cachear** — a navegação já sai em **2 queries** (espaços + páginas **sem** `content`), montada em O(n) na memória, e o layout do frontend a busca uma única vez por requisição (`cache()` do React).

## Decisão

Não cachear agora. A consulta é barata por desenho (sem N+1, sem `content`, índice `(space_id, parent_id, position)`), e cache traz um custo permanente: dados desatualizados na barra lateral logo depois de uma edição se alguma invalidação faltar.

## Consequências

- Toda renderização consulta o banco: correto e sempre atualizado.
- Sem infraestrutura extra nem estado a invalidar.

## Quando eu mudaria de ideia

Com uma medição mostrando a navegação como gargalo (ex.: `EXPLAIN ANALYZE` e latência p95 com dezenas de milhares de páginas) ou com várias instâncias da API: cache-aside em **Redis** com chave por versão (`navigation:v{n}`, incrementada em toda escrita de espaço/página), o que evita apagar chaves uma a uma.
