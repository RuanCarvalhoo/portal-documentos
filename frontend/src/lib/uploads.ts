import { PROXY_PREFIX } from './proxy.ts';

// Mesmos limites da API (backend/src/uploads/upload.util.ts); a API confere de novo pelos bytes
export const MAX_UPLOAD_MB = 5;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
/** Valor do `accept` do seletor de arquivo */
export const ACCEPT_IMAGES = ACCEPTED_TYPES.join(',');

/** Erro a mostrar antes de enviar, ou null se o arquivo pode seguir para a API. */
export function imageFileError(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Formato não suportado: envie PNG, JPEG, GIF ou WebP';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `A imagem deve ter no máximo ${MAX_UPLOAD_MB} MB`;
  }
  return null;
}

/**
 * Markdown da imagem enviada. O endereço é relativo à origem do portal (proxy /api): continua
 * valendo se o portal mudar de host ou porta.
 */
export function imageMarkdown(fileName: string, path: string): string {
  const alt = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[[\]\\]/g, '')
    .trim();
  return `![${alt || 'Imagem'}](${PROXY_PREFIX}${path})`;
}

/**
 * Insere um bloco (a imagem) no lugar do cursor ou da seleção, em linha própria, e diz onde o
 * cursor fica depois dele.
 */
export function insertBlock(text: string, start: number, end: number, block: string): { text: string; cursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = after.startsWith('\n') ? '' : '\n';
  const inserted = `${lead}${block}${trail}`;
  return { text: before + inserted + after, cursor: before.length + inserted.length };
}
