import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasRole } from './permissions.ts';

test('each role can do what the roles below it can', () => {
  assert.equal(hasRole({ role: 'ADMIN' }, 'EDITOR'), true);
  assert.equal(hasRole({ role: 'EDITOR' }, 'EDITOR'), true);
  assert.equal(hasRole({ role: 'READER' }, 'READER'), true);
});

test('no role acts above itself, and without a session nothing is allowed', () => {
  assert.equal(hasRole({ role: 'READER' }, 'EDITOR'), false);
  assert.equal(hasRole({ role: 'EDITOR' }, 'ADMIN'), false);
  assert.equal(hasRole(null, 'READER'), false);
  assert.equal(hasRole(undefined, 'READER'), false);
});
