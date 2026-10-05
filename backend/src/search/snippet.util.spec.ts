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
    expect(buildSnippet('Guia de MARKDOWN completo', 'markdown', 100)).toBe('Guia de MARKDOWN completo');
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

  describe('Markdown syntax', () => {
    it('drops heading, emphasis, inline code, quote, list and fence markers', () => {
      const markdown = [
        '## Títulos',
        '> Use **negrito**, *itálico*, ~~riscado~~ e `código`.',
        '- item',
        '1. passo',
        '```ts',
        'const x = 1;',
        '```',
      ].join('\n');

      expect(buildSnippet(markdown, 'negrito', 200)).toBe(
        'Títulos Use negrito, itálico, riscado e código. item passo const x = 1;',
      );
    });

    it('keeps table cells and drops the pipes and the separator row', () => {
      const markdown = '| Método | Rota |\n| :----- | ---: |\n| GET | `/spaces` |';

      expect(buildSnippet(markdown, 'rota', 200)).toBe('Método Rota GET /spaces');
    });

    it('keeps only the text of links and the alt of images', () => {
      expect(
        buildSnippet(
          'Veja o [guia](https://commonmark.org) e ![Diagrama](https://x.dev/a.png).',
          'guia',
          200,
        ),
      ).toBe('Veja o guia e Diagrama.');
    });

    it('keeps underscores of identifiers like snake_case and env vars', () => {
      expect(buildSnippet('Defina NEXT_PUBLIC_API_URL e use snake_case.', 'defina', 200)).toBe(
        'Defina NEXT_PUBLIC_API_URL e use snake_case.',
      );
    });

    it('stays fast on adversarial input', () => {
      const started = performance.now();
      buildSnippet(
        [
          '!['.repeat(30_000),
          '[a]('.repeat(30_000),
          `${'| - '.repeat(30_000)}x`,
          '#'.repeat(30_000),
          '> '.repeat(30_000),
          '*'.repeat(30_000),
        ].join('\n'),
        'xyz',
      );

      expect(performance.now() - started).toBeLessThan(1_000);
    });
  });
});
