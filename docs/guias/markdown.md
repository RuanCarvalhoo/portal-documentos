# Guia de Markdown

Esta página mostra **todos os elementos de Markdown** que o portal renderiza. Use-a como referência ao escrever. O mesmo componente renderiza a leitura, o preview do editor e o histórico, então o que aparece aqui é o que aparece em qualquer página.

## Títulos

Use `#` a `######` para criar títulos. O sumário "Nesta página" é gerado a partir deles, e cada título vira uma âncora (`#titulos`).

### Ênfase

Texto em **negrito**, em *itálico*, ~~riscado~~ e `código inline`.

## Listas

- Item de lista
- Outro item
  - Item aninhado

1. Primeiro passo
2. Segundo passo
3. Terceiro passo

- [x] Tarefa concluída
- [ ] Tarefa pendente

## Tabela

| Método | Rota | Perfil mínimo |
| ------ | ---- | ------------- |
| GET | `/pages/:id` | público |
| PATCH | `/pages/:id` | Editor |
| DELETE | `/spaces/:id` | Admin |

## Links

- Externo: o [guia oficial de Markdown](https://commonmark.org/help/) abre em outra aba.
- Interno: [Escrevendo no portal](escrevendo-no-portal.md) navega sem recarregar o portal.

## Imagens

Imagens enviadas pelo editor (botão **Inserir imagem**, colar ou arrastar) ficam guardadas no portal. Por exemplo, o diagrama da visão geral da arquitetura:

![Visão geral da arquitetura do portal](../diagramas/01-visao-geral.png)

Imagens por URL externa (`![descrição](https://…)`) também funcionam.

## Citação

> Documentação boa é documentação atualizada.

## Blocos de código

Indique a linguagem depois das três crases para ter destaque de sintaxe:

```typescript
interface Page {
  id: string;
  title: string;
  children: Page[];
}

export function countPages(pages: Page[]): number {
  return pages.reduce((total, page) => total + 1 + countPages(page.children), 0);
}
```

```bash
docker compose up --build
```

## O que não é renderizado

HTML escrito no Markdown (`<script>`, `<iframe>`, `<div onclick>`…) é **descartado**, e links `javascript:` são removidos. É o que protege o portal de XSS ([Segurança](../seguranca.md)).

---

Fim do guia.
