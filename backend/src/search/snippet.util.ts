const DEFAULT_RADIUS = 80;

// Sintaxe Markdown que não deve aparecer no trecho. O conteúdo vem do usuário, então as regex
// são lineares: ancoradas no início da linha ou com classes negadas que param no próximo
// delimitador, sem quantificadores aninhados (nada de ReDoS travando a busca).
// Limite conhecido: cobre a sintaxe comum; um parser de Markdown daria um trecho exato.
const FENCE = /^\s*(?:```|~~~)/;
const TABLE_RULE = /^[\s|:-]+$/;
const QUOTE = /^\s*(?:>\s?)+/;
const LINE_MARKER = /^\s*(?:#{1,6}\s+|[-*+]\s+|\d{1,9}[.)]\s+)/;
const LINK_OR_IMAGE = /!?\[([^[\]\n]*)\]\([^()\n]*\)/g;
const INLINE_MARKS = /[*`|]+|~~/g;

function toPlainText(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !FENCE.test(line) && !TABLE_RULE.test(line))
    .map((line) =>
      line.replace(QUOTE, '').replace(LINE_MARKER, '').replace(LINK_OR_IMAGE, '$1').replace(INLINE_MARKS, ''),
    )
    .join(' ');
}

/**
 * Trecho do conteúdo ao redor da primeira ocorrência do termo (sem diferenciar maiúsculas),
 * em texto puro (sem a sintaxe Markdown), com reticências onde foi cortado. Se o termo só
 * aparece no título, mostra o começo do texto.
 */
export function buildSnippet(content: string, term: string, radius = DEFAULT_RADIUS): string {
  const text = toPlainText(content).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  const start = index === -1 ? 0 : Math.max(0, index - radius);
  const end = index === -1 ? radius * 2 : Math.min(text.length, index + term.length + radius);
  const excerpt = text.slice(start, end).trim();
  return `${start > 0 ? '…' : ''}${excerpt}${end < text.length ? '…' : ''}`;
}
