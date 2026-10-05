export const MAX_UPLOAD_MB = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Formatos aceitos. SVG fica de fora: é XML que pode carregar script (XSS na origem do portal). */
export const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Tipo real da imagem pela assinatura no começo do arquivo. Nome e Content-Type vêm do cliente
 * e podem mentir (um HTML chamado foto.png); os bytes não.
 */
export function detectImageType(data: Uint8Array): ImageType | null {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString('latin1');
  if (bytes.subarray(0, 8).equals(PNG)) {
    return 'image/png';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') {
    return 'image/gif';
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** Nome para exibir e baixar: sem caminho, sem caracteres de controle nem aspas, até 200. */
export function safeFileName(original: string, type: ImageType): string {
  const base = original.split(/[\\/]/).pop() ?? '';
  // Caracteres de controle (U+0000 a U+001F e U+007F) quebrariam o header Content-Disposition
  const clean = [...base.normalize('NFC')]
    .filter((char) => char !== '"' && char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f)
    .join('')
    .trim()
    .slice(0, 200);
  return clean || `imagem.${IMAGE_TYPES[type]}`;
}
