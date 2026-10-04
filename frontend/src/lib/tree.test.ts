import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countPages, findAncestorIds, flattenTree } from './tree.ts';

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

test('flattens the tree with depths, dropping an excluded subtree', () => {
  assert.deepEqual(flattenTree(tree), [
    { id: 'a', title: 'A', depth: 0 },
    { id: 'b', title: 'B', depth: 1 },
    { id: 'c', title: 'C', depth: 2 },
    { id: 'd', title: 'D', depth: 0 },
  ]);
  assert.deepEqual(
    flattenTree(tree, 'b').map((option) => option.id),
    ['a', 'd'],
  );
});

test('excluding a root, a leaf or an unknown id', () => {
  assert.deepEqual(
    flattenTree(tree, 'a').map((option) => option.id),
    ['d'],
  );
  assert.deepEqual(
    flattenTree(tree, 'c').map((option) => option.id),
    ['a', 'b', 'd'],
  );
  assert.equal(flattenTree(tree, 'x').length, 4);
});
