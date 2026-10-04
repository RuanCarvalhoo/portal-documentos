import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractToc } from './toc.ts';

test('lists level 2 and 3 headings with rehype-slug compatible ids', () => {
  const markdown = [
    '# Título da página',
    '## Visão geral',
    'Texto.',
    '### Estrutura do **projeto**',
    '#### Detalhe fora do sumário',
    '## Visão geral',
  ].join('\n');

  assert.deepEqual(extractToc(markdown), [
    { depth: 2, text: 'Visão geral', id: 'visão-geral' },
    { depth: 3, text: 'Estrutura do projeto', id: 'estrutura-do-projeto' },
    { depth: 2, text: 'Visão geral', id: 'visão-geral-1' },
  ]);
});

test('ignores lines that look like headings inside code blocks', () => {
  const markdown = ['```bash', '## não é título', '```', '## Depois do código'].join('\n');

  assert.deepEqual(
    extractToc(markdown).map((item) => item.text),
    ['Depois do código'],
  );
});

test('uses the visible text of links in headings', () => {
  assert.equal(extractToc('## Veja o [guia](https://example.com)')[0].text, 'Veja o guia');
});
