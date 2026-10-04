import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeRedirect } from './navigation.ts';

test('keeps internal paths with query and hash', () => {
  assert.equal(safeRedirect('/pages/abc?x=1#titulo'), '/pages/abc?x=1#titulo');
});

test('falls back to the home page for missing or external targets', () => {
  const external = [
    null,
    undefined,
    '',
    'pages',
    'https://evil.example',
    'javascript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    // O parser de URL descarta estes caracteres: viraria "//evil.example"
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '/\t\\evil.example',
  ];
  for (const target of external) {
    assert.equal(safeRedirect(target), '/', JSON.stringify(target));
  }
});

test('does not send people back to the sign-in pages', () => {
  assert.equal(safeRedirect('/login'), '/');
  assert.equal(safeRedirect('/register?next=/pages/abc'), '/');
});
