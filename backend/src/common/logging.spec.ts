import type { IncomingMessage, ServerResponse } from 'node:http';
import { levelFor, pathOf, requestIdFor } from './logging';

function exchange(headers: Record<string, string> = {}) {
  const response = { setHeader: jest.fn(), statusCode: 200 };
  return {
    request: { headers } as unknown as IncomingMessage,
    response: response as unknown as ServerResponse & { setHeader: jest.Mock },
  };
}

describe('requestIdFor', () => {
  it('keeps the id sent by the frontend proxy and echoes it back', () => {
    const { request, response } = exchange({ 'x-request-id': 'abc-123' });
    expect(requestIdFor(request, response)).toBe('abc-123');
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
  });

  it.each(['', 'has space', 'x'.repeat(65), 'line\nbreak'])('replaces an unsafe id (%p)', (incoming) => {
    const { request, response } = exchange({ 'x-request-id': incoming });
    const id = requestIdFor(request, response);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', id);
  });
});

describe('pathOf', () => {
  it('drops the query string, which may carry search terms', () => {
    expect(pathOf({ url: '/search?q=segredo' })).toBe('/search');
    expect(pathOf({ originalUrl: '/pages/1?x=1', url: '/1' })).toBe('/pages/1');
    expect(pathOf({})).toBe('');
  });
});

describe('levelFor', () => {
  const at = (statusCode: number) => ({ statusCode }) as ServerResponse;
  const request = {} as IncomingMessage;

  it('maps 5xx to error, 4xx to warn and the rest to info', () => {
    expect(levelFor(request, at(503))).toBe('error');
    expect(levelFor(request, at(409))).toBe('warn');
    expect(levelFor(request, at(201))).toBe('info');
    expect(levelFor(request, at(200), new Error('aborted'))).toBe('error');
  });
});
