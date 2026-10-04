# ADR 005 — Edição concorrente de páginas: concorrência otimista

**Status:** aceito

## Contexto

Qualquer usuário logado pode editar qualquer página. Duas pessoas podem abrir a mesma página, editar ao mesmo tempo e salvar: sem controle, a segunda gravação apaga silenciosamente a primeira (*lost update*). Edições são longas (minutos no editor) e conflitos são raros.

## Opções consideradas

- **Último a salvar vence** — nenhum custo, mas perde trabalho sem avisar ninguém.
- **Lock pessimista** (`SELECT ... FOR UPDATE` ou "página em edição") — impede o conflito, mas segura locks durante minutos de edição e exige expirar locks abandonados.
- **Concorrência otimista com versão** — cada página tem `version`; quem salva informa a versão que leu, e o banco só aceita se ela ainda for a atual.

## Decisão

Concorrência otimista. `PATCH /pages/:id` exige `version`; a gravação é um único comando atômico:

```sql
UPDATE pages SET ..., version = version + 1, updated_at = now()
WHERE id = $1 AND version = $2
```

(no Prisma, `updateMany({ where: { id, version } })`). Se nenhuma linha for afetada, outra pessoa salvou antes → **409 Conflict** com a mensagem "Esta página foi alterada por outra pessoa". O frontend mantém o texto digitado e orienta a recarregar.

## Consequências

- Nenhum lock é mantido: leituras e edições não se bloqueiam.
- A checagem e a gravação acontecem no mesmo `UPDATE`, então não há janela de corrida entre "ler a versão" e "gravar".
- O cliente precisa reenviar a versão (vem em toda leitura de página).
- `updateMany` não aciona o `@updatedAt` do Prisma, por isso `updated_at` é definido explicitamente.
- Não há merge automático: em conflito, a pessoa recarrega e reaplica a mudança.

## Quando eu mudaria de ideia

Com edição colaborativa em tempo real (várias pessoas no mesmo documento), versionamento por página não basta: usaria CRDT/OT (ex.: Yjs) com sincronização por WebSocket, e guardaria histórico de versões para permitir restaurar.
