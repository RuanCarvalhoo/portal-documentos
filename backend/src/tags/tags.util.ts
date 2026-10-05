export const MAX_TAG_LENGTH = 30;
export const MAX_TAGS_PER_PAGE = 10;
// Letras (com acento) e números, separados por hífens simples: "banco-de-dados", "adr", "nestjs"
export const TAG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/**
 * Forma canônica de uma tag: "  Banco de Dados " e "banco_de_dados" viram "banco-de-dados".
 * Assim a mesma tag escrita de dois jeitos é uma tag só. Não valida: o resultado ainda passa
 * pelo TAG_PATTERN no DTO (o frontend usa a mesma regra em lib/tags.ts).
 */
export function normalizeTag(raw: string): string {
  return raw
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normaliza uma lista vinda do cliente: remove vazias e repetidas, mantendo a ordem.
 * O que não for lista de textos volta como veio, para o validador recusar com a mensagem certa.
 */
export function normalizeTags(value: unknown): unknown {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return value;
  }
  return [...new Set(value.map(normalizeTag).filter((tag) => tag !== ''))];
}

/** Mesmo conjunto de tags, em qualquer ordem? */
export function sameTags(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((tag) => set.has(tag));
}

/** Select do Prisma: nomes das tags de uma página em ordem alfabética (as respostas os achatam). */
export const TAG_NAMES = {
  select: { tag: { select: { name: true } } },
  orderBy: { tag: { name: 'asc' } },
} as const;
