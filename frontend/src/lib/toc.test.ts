import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractToc } from './toc.ts';

const ids = (markdown: string) => extractToc(markdown).map((item) => item.id);

test('lists level 2 and 3 headings with their anchor ids', () => {
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

test('keeps underscores, symbols and inline code text like the rendered anchors', () => {
  assert.deepEqual(ids('## NEXT_PUBLIC_API_URL\n## Linguagem C#\n## Use `snake_case`'), [
    'next_public_api_url',
    'linguagem-c',
    'use-snake_case',
  ]);
});

test('ignores headings inside any kind of fenced code block', () => {
  const markdown = ['````md', '```', '## dentro', '```', '````', '~~~', '## também dentro', '~~~', '## Fora'].join('\n');

  assert.deepEqual(ids(markdown), ['fora']);
});

test('finds setext headings too', () => {
  assert.deepEqual(ids('Seção\n-------\n\n## Outra'), ['seção', 'outra']);
});

test('stays fast on adversarial input', () => {
  const started = performance.now();
  extractToc(`## a${' '.repeat(40_000)}x\n${'['.repeat(10_000)}`);

  assert.ok(performance.now() - started < 1_000, 'extractToc demorou demais');
});
