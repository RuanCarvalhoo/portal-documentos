import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_PAGE, pageParam, totalPages } from './pagination.ts';

test('reads the requested page from the query string', () => {
  assert.equal(pageParam('3'), 3);
});

test('falls back to the first page for missing, invalid, repeated or non-positive values', () => {
  for (const value of [undefined, '', 'abc', '0', '-2', ['2', '3']]) {
    assert.equal(pageParam(value), 1, `pageParam(${JSON.stringify(value)})`);
  }
});

test('caps the page at the API limit', () => {
  assert.equal(pageParam('999999999'), MAX_PAGE);
});

test('counts at least one page, rounding partial pages up', () => {
  assert.equal(totalPages(0, 20), 1);
  assert.equal(totalPages(20, 20), 1);
  assert.equal(totalPages(21, 20), 2);
});
