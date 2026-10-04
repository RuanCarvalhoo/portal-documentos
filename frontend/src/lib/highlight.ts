export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Minúsculas caractere a caractere, mantendo o original quando a conversão muda o tamanho
 * (ex.: "İ" vira 2 unidades): assim os índices do texto dobrado batem com os do original.
 */
function foldCase(text: string): string {
  return Array.from(text, (char) => {
    const lower = char.toLowerCase();
    return lower.length === char.length ? lower : char;
  }).join('');
}

/**
 * Divide o texto nas ocorrências do termo (sem diferenciar maiúsculas) para destacá-las.
 * indexOf em vez de RegExp: o termo vem do usuário e não precisa ser escapado.
 */
export function highlightParts(text: string, term: string): HighlightPart[] {
  const needle = foldCase(term.trim());
  if (!needle) {
    return [{ text, match: false }];
  }
  const haystack = foldCase(text);
  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, cursor)) {
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), match: false });
    }
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }
  return parts;
}
