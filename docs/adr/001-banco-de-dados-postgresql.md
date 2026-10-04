# ADR 001 — Banco de dados: PostgreSQL

**Status:** aceito

## Contexto

O portal guarda usuários, espaços e páginas em Markdown organizadas em árvore. Os dados são fortemente relacionais: página → espaço, página → página pai, página → usuário que criou e que editou por último. O desafio exige migrations e seed automáticos ao subir com `docker compose up --build`, além de busca por título e conteúdo.

## Opções consideradas

- **PostgreSQL** — relacional, FKs com `ON DELETE CASCADE`, `WITH RECURSIVE`, busca nativa (`pg_trgm`, full-text), `JSONB` se surgir dado semiestruturado.
- **MySQL** — relacional, mas busca por substring indexada e full-text em português são mais limitadas.
- **MongoDB** — documentos; o Markdown é só texto e não justifica um banco de documentos. O Prisma **não tem `migrate`** para MongoDB (só `db push`), o que quebra o requisito de migrations.

## Decisão

PostgreSQL 17 (`postgres:17-alpine`), acessado via Prisma 7 com o driver adapter `@prisma/adapter-pg`.

## Consequências

- Integridade garantida pelo banco: excluir um espaço exclui suas páginas; excluir uma página exclui as subpáginas (FKs com `CASCADE`).
- Busca por substring indexada desde o início com `pg_trgm` + GIN (ver ADR 003), sem infraestrutura extra.
- Conteúdos grandes vão para TOAST automaticamente, então listar páginas **sem** `content` continua barato.
- O Postgres não indexa FKs sozinho. Indexei `parent_id`, porque cada `ON DELETE CASCADE` da hierarquia procura as filhas por ele. `created_by_id`/`updated_by_id` ficaram **sem** índice de propósito: ele só ajudaria ao excluir usuários (o que o sistema não faz) e custaria em toda escrita de página — por isso a migration `drop_unused_page_author_indexes` os remove.
- IDs `uuid` v7 (ordenados no tempo) para não fragmentar o índice da PK como o v4 aleatório.

## Quando eu mudaria de ideia

Se a busca virar produto (relevância avançada, facetas, tolerância a erros de digitação em grande volume), eu adicionaria um motor dedicado (Meilisearch/Elasticsearch) alimentado a partir do Postgres, que continuaria sendo a fonte da verdade.
