import assert from 'node:assert/strict';
import { test } from 'node:test';
import { highlightParts } from './highlight.ts';

test('marks every occurrence regardless of case, keeping the original text', () => {
  assert.deepEqual(highlightParts('Guia de Markdown: markdown simples', 'MARKDOWN'), [
    { text: 'Guia de ', match: false },
    { text: 'Markdown', match: true },
    { text: ': ', match: false },
    { text: 'markdown', match: true },
    { text: ' simples', match: false },
  ]);
});

test('treats regex characters in the term literally', () => {
  assert.deepEqual(
    highlightParts('use a.b ou axb', 'a.b').filter((part) => part.match).map((part) => part.text),
    ['a.b'],
  );
});

test('returns the whole text unmarked for an empty term or no match', () => {
  assert.deepEqual(highlightParts('texto', ' '), [{ text: 'texto', match: false }]);
  assert.deepEqual(highlightParts('texto', 'zzz'), [{ text: 'texto', match: false }]);
});
