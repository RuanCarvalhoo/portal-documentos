import { buildSnippet } from './snippet.util';

describe('buildSnippet', () => {
  const long = `${'a '.repeat(100)}o termo procurado aparece aqui ${'b '.repeat(100)}`;

  it('centers the excerpt on the term, with ellipses where it was cut', () => {
    const snippet = buildSnippet(long, 'termo', 20);

    expect(snippet).toContain('termo procurado');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.length).toBeLessThan(80);
  });

  it('finds the term regardless of case', () => {
    expect(buildSnippet('Guia de MARKDOWN completo', 'markdown', 100)).toBe(
      'Guia de MARKDOWN completo',
    );
  });

  it('starts from the beginning when the term is only in the title', () => {
    expect(buildSnippet('Conteúdo sem o termo. '.repeat(20), 'inexistente', 20)).toMatch(
      /^Conteúdo sem o termo\..*…$/,
    );
  });

  it('collapses line breaks and repeated spaces', () => {
    expect(buildSnippet('linha 1\n\n  linha   2', 'linha', 100)).toBe('linha 1 linha 2');
  });

  it('returns an empty string for empty content', () => {
    expect(buildSnippet('', 'termo')).toBe('');
  });
});
