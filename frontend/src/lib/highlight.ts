export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Divide o texto nas ocorrências do termo (sem diferenciar maiúsculas) para destacá-las.
 * indexOf em vez de RegExp: o termo vem do usuário e não precisa ser escapado.
 */
export function highlightParts(text: string, term: string): HighlightPart[] {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return [{ text, match: false }];
  }
  const haystack = text.toLowerCase();
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
