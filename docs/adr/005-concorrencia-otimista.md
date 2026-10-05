# ADR 005 — Edição concorrente de páginas e espaços: concorrência otimista

**Status:** aceito

## Contexto

Qualquer Editor ou Admin pode editar qualquer página ou espaço. Duas pessoas podem abrir a mesma página, editar ao mesmo tempo e salvar: sem controle, a segunda gravação apaga silenciosamente a primeira (*lost update*). Edições são longas (minutos no editor) e conflitos são raros.

## Opções consideradas

- **Último a salvar vence** — nenhum custo, mas perde trabalho sem avisar ninguém.
- **Lock pessimista** (`SELECT ... FOR UPDATE` ou "página em edição") — impede o conflito, mas segura locks durante minutos de edição e exige expirar locks abandonados.
- **Concorrência otimista com versão** — cada página tem `version`; quem salva informa a versão que leu, e o banco só aceita se ela ainda for a atual.

## Decisão

Concorrência otimista. `PATCH /pages/:id` exige `version`; a gravação é um único comando atômico:

```sql
UPDATE pages SET ..., version = version + 1, updated_at = ...
WHERE id = $1 AND version = $2
RETURNING ...
```

(no Prisma, `update({ where: { id, version } })`). Se nenhuma linha casar, a API distingue: a página ainda existe → outra pessoa salvou antes → **409 Conflict** ("Esta página foi alterada por outra pessoa"); a página sumiu → **404**. O frontend mantém o texto digitado e oferece ver a versão atual (nova aba) ou salvar por cima dela, por escolha explícita.

Os **espaços** seguem a mesma regra: `PATCH /spaces/:id` também exige `version`, responde 409 ("Este espaço foi alterado por outra pessoa") e o formulário do espaço oferece as mesmas duas saídas. Na primeira versão só as páginas tinham `version`, e editar o nome e a descrição de um espaço em duas abas fazia a segunda gravação apagar a primeira sem aviso. A migration `add_space_version` corrigiu isso, e os espaços existentes começam na versão 1.

## Consequências

- Edições de conteúdo não mantêm lock: leituras e edições não se bloqueiam.
- A checagem da versão e a gravação acontecem no mesmo `UPDATE`, então não há janela de corrida para a **mesma página** (testado: dois saves simultâneos da mesma versão → um 200, um 409).
- Criar, mover ou excluir páginas não muda a `version` do espaço: ela protege só o nome e a descrição.
- A versão protege uma linha, não a **estrutura**: duas movimentações opostas simultâneas (A para dentro de B e B para dentro de A) passariam na checagem de ciclo e formariam um laço. Por isso criar e mover páginas rodam numa transação que trava a linha do espaço (`SELECT ... FOR UPDATE`): mudanças de estrutura no mesmo espaço entram em fila, o que também evita posições duplicadas entre irmãos.
- O cliente precisa reenviar a versão (vem em toda leitura de página e de espaço).
- Um PATCH que não muda nada (mesmo título, conteúdo e pai; no espaço, mesmo nome e descrição) responde 200 com o registro atual, sem gravar e sem checar a versão: salvar uma página intocada não deve causar 409 em quem a edita ao mesmo tempo.
- Não há merge automático: em conflito, a pessoa compara com a versão atual e decide se salva por cima.

## Quando eu mudaria de ideia

Com edição colaborativa em tempo real (várias pessoas no mesmo documento), versionamento por página não basta: usaria CRDT/OT (ex.: Yjs) com sincronização por WebSocket (o histórico de versões, que permite restaurar, já existe: [ADR 007](007-historico-de-versoes.md)).
