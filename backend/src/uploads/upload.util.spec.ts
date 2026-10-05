import { detectImageType, safeFileName } from './upload.util';

const bytes = (...values: (number | string)[]) =>
  Buffer.concat(
    values.map((value) => (typeof value === 'string' ? Buffer.from(value, 'latin1') : Buffer.from([value]))),
  );

describe('detectImageType', () => {
  it('recognizes each accepted format by its signature', () => {
    expect(detectImageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 'resto'))).toBe('image/png');
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 'resto'))).toBe('image/jpeg');
    expect(detectImageType(bytes('GIF89a', 'resto'))).toBe('image/gif');
    expect(detectImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '))).toBe('image/webp');
  });

  it('rejects anything else, whatever its name says', () => {
    expect(detectImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectImageType(bytes('<!doctype html><script>'))).toBeNull();
    expect(detectImageType(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe('safeFileName', () => {
  it('keeps only the base name, without control characters or quotes', () => {
    expect(safeFileName('C:\\fotos\\diagrama "final".png', 'image/png')).toBe('diagrama final.png');
    expect(safeFileName('../../etc/passwd\n.png', 'image/png')).toBe('passwd.png');
    expect(safeFileName('Arquitetura — visão.png', 'image/png')).toBe('Arquitetura — visão.png');
  });

  it('falls back to a generic name with the real extension', () => {
    expect(safeFileName('', 'image/webp')).toBe('imagem.webp');
  });
});
