import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countPages, findAncestorIds } from './tree.ts';

const tree = [
  {
    id: 'a',
    title: 'A',
    children: [{ id: 'b', title: 'B', children: [{ id: 'c', title: 'C', children: [] }] }],
  },
  { id: 'd', title: 'D', children: [] },
];

test('lists the ancestors from the root down to the parent', () => {
  assert.deepEqual(findAncestorIds(tree, 'c'), ['a', 'b']);
});

test('returns an empty list for a root page', () => {
  assert.deepEqual(findAncestorIds(tree, 'd'), []);
});

test('returns null for a page outside the tree', () => {
  assert.equal(findAncestorIds(tree, 'x'), null);
});

test('counts pages on every level', () => {
  assert.equal(countPages(tree), 4);
  assert.equal(countPages([]), 0);
});
