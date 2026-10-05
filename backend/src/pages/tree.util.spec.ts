import { buildTree, depthOf, isSelfOrDescendant, subtreeHeight } from './tree.util';

const row = (id: string, parentId: string | null, title = id) => ({ id, title, parentId });

describe('buildTree', () => {
  it('nests children under their parents, keeping the input order', () => {
    const tree = buildTree([row('a', null), row('b', 'a'), row('c', 'a'), row('d', 'b'), row('e', null)]);

    expect(tree).toEqual([
      {
        id: 'a',
        title: 'a',
        children: [
          { id: 'b', title: 'b', children: [{ id: 'd', title: 'd', children: [] }] },
          { id: 'c', title: 'c', children: [] },
        ],
      },
      { id: 'e', title: 'e', children: [] },
    ]);
  });

  it('handles children listed before their parent', () => {
    const tree = buildTree([row('child', 'root'), row('root', null)]);

    expect(tree).toEqual([
      { id: 'root', title: 'root', children: [{ id: 'child', title: 'child', children: [] }] },
    ]);
  });

  it('keeps a page whose parent is missing as a root instead of dropping it', () => {
    expect(buildTree([row('orphan', 'gone')])).toEqual([{ id: 'orphan', title: 'orphan', children: [] }]);
  });

  it('returns an empty tree for no pages', () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe('isSelfOrDescendant', () => {
  // a → b → c ; d solta
  const parentById = new Map<string, string | null>([
    ['a', null],
    ['b', 'a'],
    ['c', 'b'],
    ['d', null],
  ]);

  it.each([
    ['the page itself', 'a', 'a', true],
    ['a child', 'a', 'b', true],
    ['a grandchild', 'a', 'c', true],
    ['an ancestor', 'c', 'a', false],
    ['an unrelated page', 'a', 'd', false],
  ])('detects %s', (_label, pageId, candidateId, expected) => {
    expect(isSelfOrDescendant(pageId, candidateId, parentById)).toBe(expected);
  });

  it('stops on corrupted data with a loop instead of hanging', () => {
    const looped = new Map<string, string | null>([
      ['x', 'y'],
      ['y', 'x'],
    ]);

    expect(isSelfOrDescendant('z', 'x', looped)).toBe(false);
  });
});

// a ─ b ─ c ─ d      x (raiz sozinha)
//   └ e
const hierarchy = new Map<string, string | null>([
  ['a', null],
  ['b', 'a'],
  ['c', 'b'],
  ['d', 'c'],
  ['e', 'a'],
  ['x', null],
]);

describe('depthOf', () => {
  it('counts the levels from the root down to the page (root = 1)', () => {
    expect(depthOf('a', hierarchy)).toBe(1);
    expect(depthOf('e', hierarchy)).toBe(2);
    expect(depthOf('d', hierarchy)).toBe(4);
  });

  it('stops on corrupted data with a loop instead of running forever', () => {
    expect(
      depthOf(
        'p',
        new Map([
          ['p', 'q'],
          ['q', 'p'],
        ]),
      ),
    ).toBe(2);
  });
});

describe('subtreeHeight', () => {
  it('counts how many levels the page and its descendants take (leaf = 1)', () => {
    expect(subtreeHeight('x', hierarchy)).toBe(1);
    expect(subtreeHeight('c', hierarchy)).toBe(2);
    expect(subtreeHeight('a', hierarchy)).toBe(4);
  });

  it('stops on corrupted data with a loop instead of running forever', () => {
    expect(
      subtreeHeight(
        'p',
        new Map([
          ['p', 'q'],
          ['q', 'p'],
        ]),
      ),
    ).toBe(2);
  });
});
