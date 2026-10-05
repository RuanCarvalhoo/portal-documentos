import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmLeave, hasUnsaved, leavesPage, setUnsaved } from './unsaved.ts';

const HERE = 'http://localhost:3000/pages/abc/edit';
const link = (href: string, extra: { target?: string; hasDownload?: boolean } = {}) => ({
  href,
  target: extra.target ?? '',
  hasDownload: extra.hasDownload ?? false,
});
const LEFT_CLICK = { button: 0, modified: false };

test('a plain click on a link to another page of the portal leaves the page', () => {
  assert.equal(leavesPage(link('http://localhost:3000/pages/abc'), LEFT_CLICK, HERE), true);
  assert.equal(leavesPage(link('http://localhost:3000/pages/abc/edit?x=1'), LEFT_CLICK, HERE), true);
});

test('clicks that keep this tab on the page do not count', () => {
  const internal = link('http://localhost:3000/pages/abc');
  assert.equal(leavesPage(internal, { button: 1, modified: false }, HERE), false, 'botão do meio');
  assert.equal(leavesPage(internal, { button: 0, modified: true }, HERE), false, 'ctrl/cmd/shift');
  assert.equal(leavesPage(link('http://localhost:3000/x', { target: '_blank' }), LEFT_CLICK, HERE), false);
  assert.equal(leavesPage(link('http://localhost:3000/x', { hasDownload: true }), LEFT_CLICK, HERE), false);
  assert.equal(leavesPage(link(`${HERE}#portal-conteudo`), LEFT_CLICK, HERE), false, 'âncora da própria página');
  // Ex.: em /spaces/new, o link "Novo espaço" da barra lateral: a rota não muda e o form fica
  assert.equal(leavesPage(link(HERE), LEFT_CLICK, HERE), false, 'a própria página');
});

test('links to other sites are left to the browser beforeunload prompt (no double prompt)', () => {
  assert.equal(leavesPage(link('https://commonmark.org/help/'), LEFT_CLICK, HERE), false);
});

test('confirmLeave only asks when there are unsaved changes, and clears them once accepted', () => {
  const answers: boolean[] = [];
  const asked: string[] = [];
  globalThis.window = {
    confirm: (message: string) => {
      asked.push(message);
      return answers.shift() ?? false;
    },
  } as unknown as Window & typeof globalThis;

  setUnsaved(false);
  assert.equal(confirmLeave(), true);
  assert.equal(asked.length, 0);

  setUnsaved(true);
  answers.push(false);
  assert.equal(confirmLeave(), false);
  assert.equal(hasUnsaved(), true, 'recusou: as alterações continuam pendentes');

  answers.push(true);
  assert.equal(confirmLeave(), true);
  assert.equal(hasUnsaved(), false, 'aceitou descartar: o beforeunload não pergunta de novo');
});
