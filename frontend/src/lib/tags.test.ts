import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addTags, isValidTag, normalizeTag, tagHref } from './tags.ts';

test('normalizes like the API does', () => {
  assert.equal(normalizeTag('  Banco de Dados '), 'banco-de-dados');
  assert.equal(normalizeTag('banco_de_dados'), 'banco-de-dados');
  assert.equal(normalizeTag('Configuração'), 'configuração');
  assert.equal(isValidTag('next.js'), false);
  assert.equal(isValidTag('x'.repeat(31)), false);
});

test('adds several comma separated tags, skipping repeated ones', () => {
  assert.deepEqual(addTags(['api'], 'Busca, API ,  ,banco de dados'), { tags: ['api', 'busca', 'banco-de-dados'] });
});

test('adds nothing when one of the typed tags is invalid', () => {
  const result = addTags(['api'], 'busca, #ruim');
  assert.deepEqual(result.tags, ['api']);
  assert.match(result.error ?? '', /#ruim/);
});

test('stops at the maximum number of tags', () => {
  const ten = Array.from({ length: 10 }, (_, i) => `t${i}`);
  assert.equal(addTags(ten, 'mais').error, 'Use no máximo 10 tags por página');
  assert.deepEqual(addTags(ten, 't3').tags, ten);
});

test('builds an encoded link to the tag page', () => {
  assert.equal(tagHref('configuração'), '/tags/configura%C3%A7%C3%A3o');
});
