# ADR 003 — Busca: ILIKE indexado com pg_trgm

**Status:** aceito

## Contexto

A busca precisa encontrar páginas pelo **título e pelo conteúdo**, a partir de qualquer trecho de palavra digitado pela pessoa ("markd" acha "Markdown"). Sem índice, `ILIKE '%termo%'` lê a tabela inteira — o B-tree comum não ajuda quando há curinga à esquerda.

## Opções consideradas

- **`ILIKE` sem índice** — simples, mas varre todas as páginas a cada busca.
- **`ILIKE` + `pg_trgm` com índice GIN** — o Postgres quebra o texto em trigramas e o índice encontra substrings, em qualquer posição, sem infraestrutura extra.
- **Full-text search (`tsvector`)** — stemming ("documentos" acha "documento"), sem acento e ranking por relevância; mas casa palavras inteiras, não trechos.
- **Motor externo (Meilisearch/Elasticsearch)** — relevância e tolerância a erros, ao custo de outro serviço para operar e sincronizar.

## Decisão

`contains` + `mode: 'insensitive'` do Prisma (gera `ILIKE '%termo%'`, com o termo como parâmetro) em `title` e `content`, atendido por dois índices GIN `gin_trgm_ops`. Regras derivadas de medição:

- **Sempre com `ORDER BY`** (`updated_at DESC, id`): só com `LIMIT`, o planner preferiu seq scan — com 20 mil páginas, 3,4 s contra 34 ms usando os índices.
- **Termo com no mínimo 3 caracteres**: trigramas precisam de 3 caracteres; abaixo disso o índice não é usado e a API responde 400.
- Resultado paginado, com nome do espaço e um trecho do conteúdo ao redor do termo.

Plano da consulta (com o seq scan desligado só para provar que o índice é aplicável à tabela pequena do seed):

```
Limit → Sort (updated_at DESC, id) → Bitmap Heap Scan on pages
  → BitmapOr
      → Bitmap Index Scan on pages_title_trgm_idx
      → Bitmap Index Scan on pages_content_trgm_idx
```

## Consequências

- Busca por substring indexada desde o início, só com PostgreSQL.
- Sem relevância nem stemming: a ordem é "editadas recentemente primeiro"; "documentos" não acha "documento" por si só.
- Os índices GIN deixam as escritas de página um pouco mais caras (aceitável: leitura domina).

## Quando eu mudaria de ideia

Quando relevância importar, adicionaria **full-text** (`tsvector` gerado com peso A para título e B para conteúdo, configuração `portuguese` + `unaccent`, `ts_rank` e `ts_headline`) mantendo o trigram para buscas parciais. Se a busca virasse produto (facetas, sinônimos, tolerância a erro de digitação em grande volume), usaria um motor dedicado alimentado a partir do Postgres.
