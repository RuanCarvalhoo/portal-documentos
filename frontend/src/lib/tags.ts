// Mesmas regras da API (backend/src/tags/tags.util.ts): o que passa aqui, a API aceita
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
const TAG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/** "  Banco de Dados " e "banco_de_dados" viram "banco-de-dados". */
export function normalizeTag(raw: string): string {
  return raw
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidTag(tag: string): boolean {
  return tag.length <= MAX_TAG_LENGTH && TAG_PATTERN.test(tag);
}

/**
 * Acrescenta o que foi digitado (uma ou várias tags separadas por vírgula) às tags atuais.
 * Repetidas são ignoradas; a primeira inválida volta como erro e nada é acrescentado.
 */
export function addTags(current: readonly string[], typed: string): { tags: string[]; error?: string } {
  const next = [...current];
  for (const tag of typed.split(',').map(normalizeTag).filter(Boolean)) {
    if (!isValidTag(tag)) {
      return {
        tags: [...current],
        error:
          tag.length > MAX_TAG_LENGTH
            ? `Cada tag deve ter no máximo ${MAX_TAG_LENGTH} caracteres`
            : `"${tag}": use só letras, números e hífens`,
      };
    }
    if (!next.includes(tag)) {
      next.push(tag);
    }
  }
  if (next.length > MAX_TAGS) {
    return { tags: [...current], error: `Use no máximo ${MAX_TAGS} tags por página` };
  }
  return { tags: next };
}

/** Link da página de uma tag. */
export function tagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}`;
}
