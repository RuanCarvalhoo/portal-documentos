import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError, apiFetch } from './api.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
const respondWith = (response: Response | Error) => {
  globalThis.fetch = (async () => {
    if (response instanceof Error) {
      throw response;
    }
    return response;
  }) as typeof fetch;
};

test('returns the parsed body of a successful response', async () => {
  respondWith(new Response(JSON.stringify({ id: 'p1' }), { status: 200 }));
  assert.deepEqual(await apiFetch('/pages/p1'), { id: 'p1' });
});

test('returns undefined for 204 No Content', async () => {
  respondWith(new Response(null, { status: 204 }));
  assert.equal(await apiFetch('/pages/p1', { method: 'DELETE' }), undefined);
});

test('turns the error envelope into an ApiError with every message', async () => {
  respondWith(new Response(JSON.stringify({ statusCode: 400, message: ['a', 'b'] }), { status: 400 }));
  await assert.rejects(apiFetch('/spaces'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.deepEqual(error.messages, ['a', 'b']);
    return true;
  });
});

test('reports a network failure as status 0', async () => {
  respondWith(new TypeError('fetch failed'));
  await assert.rejects(apiFetch('/spaces'), (error) => error instanceof ApiError && error.status === 0);
});

test('never treats a 2xx whose body could not be read as a successful null', async () => {
  // Ex.: o tempo acabou no meio da leitura do corpo. Devolver null faria /auth/me "dar certo"
  // sem usuário, e a aba ficaria deslogada com um token válido salvo.
  respondWith(new Response('{"id":', { status: 200 }));
  await assert.rejects(apiFetch('/auth/me'), (error) => error instanceof ApiError && error.status === 0);
});
