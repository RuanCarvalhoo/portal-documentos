import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageFileError, imageMarkdown, insertBlock } from './uploads.ts';

test('accepts only the image formats and size the API accepts', () => {
  assert.equal(imageFileError({ type: 'image/png', size: 1024 }), null);
  assert.match(imageFileError({ type: 'image/svg+xml', size: 10 }) ?? '', /Formato não suportado/);
  assert.match(imageFileError({ type: 'image/jpeg', size: 6 * 1024 * 1024 }) ?? '', /5 MB/);
});

test('builds the markdown with a readable alt text and the proxy path', () => {
  assert.equal(imageMarkdown('modelo-de_dados.png', '/uploads/u1'), '![modelo de dados](/api/uploads/u1)');
  assert.equal(imageMarkdown('[x].png', '/uploads/u2'), '![x](/api/uploads/u2)');
  assert.equal(imageMarkdown('.png', '/uploads/u3'), '![Imagem](/api/uploads/u3)');
});

test('inserts the image on a line of its own and moves the cursor past it', () => {
  assert.deepEqual(insertBlock('', 0, 0, '![a](x)'), { text: '![a](x)\n', cursor: 8 });
  assert.deepEqual(insertBlock('Texto', 5, 5, '![a](x)'), { text: 'Texto\n\n![a](x)\n', cursor: 15 });
  assert.deepEqual(insertBlock('Um\n\nDois', 4, 4, '![a](x)'), { text: 'Um\n\n![a](x)\nDois', cursor: 12 });
  // Seleção: a imagem substitui o texto selecionado
  assert.deepEqual(insertBlock('A trocar\n', 0, 8, '![a](x)'), { text: '![a](x)\n', cursor: 7 });
});
