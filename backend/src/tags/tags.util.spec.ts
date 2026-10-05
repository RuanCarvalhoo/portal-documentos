import { normalizeTag, normalizeTags, sameTags, TAG_PATTERN } from './tags.util';

describe('normalizeTag', () => {
  it.each([
    ['  Banco de Dados ', 'banco-de-dados'],
    ['banco_de_dados', 'banco-de-dados'],
    ['ADR', 'adr'],
    ['Configuração', 'configuração'],
    ['--a  --  b--', 'a-b'],
  ])('%p becomes %p', (raw, tag) => {
    expect(normalizeTag(raw)).toBe(tag);
  });

  it('produces tags that match the pattern, and leaves symbols for the validator to reject', () => {
    expect(TAG_PATTERN.test(normalizeTag('  Next.js '))).toBe(false);
    expect(TAG_PATTERN.test(normalizeTag('nestjs 12'))).toBe(true);
    expect(TAG_PATTERN.test(normalizeTag('#tag'))).toBe(false);
  });
});

describe('normalizeTags', () => {
  it('drops empty and repeated tags, keeping the order', () => {
    expect(normalizeTags(['Busca', ' ', 'busca', 'API'])).toEqual(['busca', 'api']);
  });

  it('returns anything that is not a list of strings untouched for the validator', () => {
    expect(normalizeTags('busca')).toBe('busca');
    expect(normalizeTags(['a', 1])).toEqual(['a', 1]);
  });
});

describe('sameTags', () => {
  it('compares as sets', () => {
    expect(sameTags(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameTags(['a'], ['a', 'b'])).toBe(false);
    expect(sameTags([], [])).toBe(true);
  });
});
