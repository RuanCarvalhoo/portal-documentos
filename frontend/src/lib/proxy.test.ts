import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forwardHeaders, proxyError, requestIdOf, responseHeaders, upstreamUrl } from './proxy.ts';

const API = 'http://backend:3001';

test('maps /api paths onto the API, keeping the query string', () => {
  assert.equal(upstreamUrl(API, '/api/spaces', '?page=2'), 'http://backend:3001/spaces?page=2');
  assert.equal(upstreamUrl(`${API}/`, '/api/pages/p1/versions/3', ''), 'http://backend:3001/pages/p1/versions/3');
});

test('never lets the path choose another host', () => {
  assert.equal(upstreamUrl(API, '/api//evil.example/x', ''), 'http://backend:3001//evil.example/x');
  assert.equal(upstreamUrl(API, '/api/@evil.example', ''), 'http://backend:3001/@evil.example');
  assert.equal(upstreamUrl(API, '/api', ''), null);
  assert.equal(upstreamUrl(API, '/apis/x', ''), null);
});

test('keeps a safe incoming request id and replaces anything else', () => {
  assert.equal(requestIdOf('abc-123_DEF'), 'abc-123_DEF');
  for (const bad of [null, '', 'a b', 'x'.repeat(65), 'id\nforged']) {
    assert.match(requestIdOf(bad), /^[0-9a-f-]{36}$/);
  }
});

test('forwards only the allowlisted headers plus the request id', () => {
  const incoming = new Headers({
    authorization: 'Bearer t',
    'content-type': 'application/json',
    cookie: 'session=1',
    'x-portal-client-ip': '6.6.6.6',
    'x-portal-proxy-secret': 'guessed',
  });
  const headers = forwardHeaders(incoming, { requestId: 'r1', clientIp: null });
  assert.deepEqual(Object.fromEntries(headers), {
    authorization: 'Bearer t',
    'content-type': 'application/json',
    'x-request-id': 'r1',
  });
});

test('passes the client ip to the API only with the shared secret', () => {
  const withSecret = forwardHeaders(new Headers(), { requestId: 'r', clientIp: '203.0.113.7', secret: 's' });
  assert.equal(withSecret.get('x-portal-client-ip'), '203.0.113.7');
  assert.equal(withSecret.get('x-portal-proxy-secret'), 's');
  const withoutSecret = forwardHeaders(new Headers(), { requestId: 'r', clientIp: '203.0.113.7' });
  assert.equal(withoutSecret.get('x-portal-client-ip'), null);
});

test('returns the useful response headers and drops a length the fetch already decoded', () => {
  const plain = responseHeaders(
    new Headers({ 'content-type': 'image/png', 'content-length': '10', etag: '"a"', 'set-cookie': 'x=1' }),
  );
  assert.deepEqual(Object.fromEntries(plain), { 'content-length': '10', 'content-type': 'image/png', etag: '"a"' });
  const gzip = responseHeaders(new Headers({ 'content-length': '10', 'content-encoding': 'gzip' }));
  assert.equal(gzip.get('content-length'), null);
});

test('answers its own errors in the API error envelope', () => {
  const body = proxyError(502, '/api/spaces', 'r1');
  assert.equal(body.statusCode, 502);
  assert.equal(body.requestId, 'r1');
  assert.match(body.message, /Não foi possível conectar à API/);
});
