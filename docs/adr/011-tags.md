# ADR 011 — Tags: tabela própria com relação N:N e nome normalizado

**Status:** aceito

## Contexto

Espaços e a árvore de páginas organizam por **lugar** ("onde esta página mora"). Muitos assuntos atravessam essa organização: "segurança" aparece na arquitetura, num ADR e num guia. As tags dão essa segunda dimensão. Quem lê clica numa tag e vê todas as páginas daquele assunto, em qualquer espaço.

## Opções consideradas

- **Coluna `text[]` em `pages` com índice GIN**: uma tabela a menos, e `tags @> ARRAY['x']` é indexável. Por outro lado, listar as tags com contagem exige `unnest` e agregação, e renomear uma tag significaria reescrever todas as páginas.
- **Tabelas `tags` + `page_tags` (N:N)**: modelagem relacional clássica, com uma tag por linha e o `unique` garantindo uma só "banco-de-dados". A contagem por tag vira um `COUNT` pela FK indexada, e a tabela comporta metadados no futuro (descrição, cor).
- **Tags livres sem normalizar**: "Banco de Dados", "banco-de-dados" e "banco_de_dados" virariam três tags.

## Decisão

- Tabelas `tags (id, name unique)` e `page_tags (page_id, tag_id)`, com PK composta, índice em `tag_id` e cascade dos dois lados.
- **Nome canônico:** trim, minúsculas, espaços e `_` viram `-`, hífens repetidos colapsam. O resultado precisa casar com `^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$` (letras com acento e números) e ter até 30 caracteres. A mesma regra existe no backend (`tags.util.ts`, que valida) e no frontend (`lib/tags.ts`, que dá o retorno na hora).
- **Até 10 tags por página**, enviadas como lista completa no `POST`/`PATCH` da página: o `PATCH` substitui o conjunto, e omitir mantém o atual.
- **Tags são metadado, como a posição:** trocar só as tags incrementa `version` (a concorrência otimista continua valendo), mas não gera entrada no histórico (o trigger olha título e conteúdo) e não muda o "editada por". O mesmo conjunto em outra ordem não conta como mudança.
- **Tags novas entram com `INSERT … ON CONFLICT DO NOTHING`** (`createMany` com `skipDuplicates`) antes de ligar à página. Assim, duas páginas criando a mesma tag nova ao mesmo tempo não colidem no `unique`, o que o `connectOrCreate` do Prisma não garante.
- **Rotas públicas:** `GET /tags` (tags em uso com `pageCount`) e `GET /tags/:name/pages` (páginas com espaço e tags, das editadas mais recentemente). O nome na URL é normalizado: `/tags/Banco%20de%20Dados` vale o mesmo que `/tags/banco-de-dados`, e o frontend redireciona para a forma canônica.

## Consequências

- Uma tag sem páginas continua na tabela, mas fica fora das listas (`WHERE EXISTS page_tags`). Não há limpeza automática; o custo é desprezível.
- O histórico de versões não guarda as tags. Restaurar uma versão mantém as tags atuais.
- A busca textual não considera tags. Para filtrar por tag, use a página da tag.

## Quando eu mudaria de ideia

Com milhares de tags ou um time de curadoria, eu acrescentaria uma tela de gestão de tags (renomear, mesclar sinônimos, descrição), o que a tabela própria já comporta, e o filtro por tag na busca (`/search?q=…&tag=…`).
