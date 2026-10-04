import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeRedirect } from './navigation.ts';

test('keeps internal paths', () => {
  assert.equal(safeRedirect('/pages/abc?x=1'), '/pages/abc?x=1');
});

test('falls back to the home page for missing or external targets', () => {
  for (const target of [null, undefined, '', 'pages', 'https://evil.example', '//evil.example', '/\\evil.example']) {
    assert.equal(safeRedirect(target), '/', String(target));
  }
});
