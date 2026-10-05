# ADR 012 — Perfis de acesso: Admin, Editor e Leitor

**Status:** aceito (substitui a premissa "qualquer conta logada edita tudo")

## Contexto

Até aqui o cadastro era aberto e qualquer conta logada criava, editava e excluía qualquer conteúdo. O rate limit das escritas freava abuso em massa, mas uma conta recém-criada ainda conseguia excluir um espaço inteiro. O desafio lista perfis de acesso entre os diferenciais.

A leitura continua pública: o portal é documentação, e as páginas são renderizadas no servidor (o token fica no `localStorage`, que o servidor não enxerga).

## Opções consideradas

- **Papel global por conta (RBAC simples)**: um campo `role` no usuário e uma hierarquia fixa. Cobre "quem pode escrever" e "quem administra" com uma coluna e um guard.
- **Permissões por espaço** (tabela `space_members` com papel por espaço): mais flexível (time A edita só o espaço A), mas toda escrita e toda tela passam a depender de um join. Seria complexidade antes da necessidade.
- **Políticas/ABAC** (CASL, OPA): regras por atributo, como "autor edita a própria página". Poderoso, mas exagerado para três perfis.
- **Perfil dentro do JWT**: evita a consulta ao banco, mas um rebaixamento só valeria quando o token expirasse (até 8 h).

## Decisão

- **Enum `user_role` com três perfis em hierarquia** (cada um pode o que os anteriores podem):

  | Ação | Leitor | Editor | Admin |
  |---|---|---|---|
  | Ler espaços, páginas, histórico, busca, tags e imagens (também sem login) | ✔ | ✔ | ✔ |
  | Criar e editar espaços; criar, editar, mover, restaurar e excluir páginas; tags; enviar imagens | | ✔ | ✔ |
  | Excluir espaços (leva a árvore inteira) | | | ✔ |
  | Listar contas e trocar perfis (`GET /users`, `PATCH /users/:id/role`) | | | ✔ |

- **Conta nova entra como Leitor**: o cadastro continua aberto, mas escrever passa a exigir que um Admin promova a conta. O cadastro recusa o campo `role` (400), então ninguém escolhe o próprio perfil.
- **O `AuthGuard` lê o perfil no banco a cada requisição autenticada** (uma leitura pela chave primária), não do token. Promover, rebaixar ou remover uma conta vale na hora.
- **O decorator `@Auth(Role.EDITOR)`** declara o perfil mínimo da rota. Abaixo dele a resposta é **403** "Seu perfil não permite esta ação"; sem login, continua 401.
- **O portal nunca fica sem Admin:** rebaixar o último responde 409. A checagem trava as linhas dos Admins (`FOR UPDATE`), para que dois rebaixamentos simultâneos entrem em fila.
- **A migration preserva quem já existia:** as contas viram Editor e a mais antiga vira Admin.
- **O seed cria uma conta de cada perfil:** `demo@example.com` (Admin), `editor@example.com` e `leitor@example.com`.
- **Frontend:** `AuthOnly`/`RequireAuth` recebem o perfil mínimo e escondem os botões. O header mostra o perfil, o Admin ganha a tela **Usuários** e a API continua sendo quem garante a regra.
- **Auditoria:** cada troca de perfil gera o evento `user.role_changed` no log, com quem mudou o quê ([ADR 009](009-logs-estruturados.md)).

## Consequências

- Uma consulta a mais por requisição autenticada. Ela é barata (índice da PK) e só acontece em escritas e no `/auth/me`; a leitura pública não passa pelo guard.
- No frontend, o perfil só é atualizado ao recarregar ou ao entrar de novo. Até lá, quem foi rebaixado ainda vê um botão, e a API responde 403 ao clicar.
- A granularidade é global: não existe "editor só do espaço X".

## Quando eu mudaria de ideia

Com vários times dividindo o portal, eu passaria para **papéis por espaço** (`space_members(space_id, user_id, role)`), mantendo o perfil global para o Admin. Com leitura restrita (documentação interna), eu moveria a sessão para cookie `httpOnly` ([ADR 004](004-autenticacao-jwt.md)), para o servidor do Next conseguir checar o perfil ao renderizar.
