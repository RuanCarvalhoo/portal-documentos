const DEFAULT_RADIUS = 80;

/**
 * Trecho do conteúdo ao redor da primeira ocorrência do termo (sem diferenciar maiúsculas),
 * com reticências onde foi cortado. Se o termo só aparece no título, mostra o começo do texto.
 */
export function buildSnippet(content: string, term: string, radius = DEFAULT_RADIUS): string {
  const text = content.replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  const start = index === -1 ? 0 : Math.max(0, index - radius);
  const end = index === -1 ? radius * 2 : Math.min(text.length, index + term.length + radius);
  const excerpt = text.slice(start, end).trim();
  return `${start > 0 ? '…' : ''}${excerpt}${end < text.length ? '…' : ''}`;
}
