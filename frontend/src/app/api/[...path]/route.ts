import type { NextRequest } from 'next/server';
import { serverApiUrl } from '@/lib/api';
import { lastForwardedIp } from '@/lib/forwarded-for';
import { describeError, logEvent } from '@/lib/log';
import {
  REQUEST_ID_HEADER,
  forwardHeaders,
  proxyError,
  requestIdOf,
  responseHeaders,
  upstreamUrl,
} from '@/lib/proxy';

// Repassa toda chamada do navegador para a API (ADR 008). Runtime Node: o IP do cliente usa
// node:net e o corpo (inclusive o multipart do upload) segue em stream, sem ficar em memória.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Maior que o statement_timeout da API (10 s): quem responde ao limite é ela, com o erro dela
const UPSTREAM_TIMEOUT_MS = 30_000;

async function proxy(request: NextRequest): Promise<Response> {
  const { pathname, search } = new URL(request.url);
  const requestId = requestIdOf(request.headers.get(REQUEST_ID_HEADER));
  const target = upstreamUrl(serverApiUrl(), pathname, search);
  if (!target) {
    return Response.json(proxyError(400, pathname, requestId), { status: 400 });
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: forwardHeaders(request.headers, {
        requestId,
        clientIp: lastForwardedIp(request.headers.get('x-forwarded-for')),
        secret: process.env.INTERNAL_API_SECRET,
      }),
      body: hasBody ? request.body : undefined,
      // Exigido pelo fetch do Node para enviar um corpo em stream
      duplex: 'half',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    } as RequestInit & { duplex: 'half' });
  } catch (error) {
    const status = error instanceof DOMException && error.name === 'TimeoutError' ? 504 : 502;
    // Sem a query string, que pode ter termos de busca (mesma regra do log da API)
    logEvent('error', 'Falha ao repassar a requisição para a API', {
      requestId,
      method: request.method,
      path: pathname,
      status,
      error: describeError(error),
    });
    return Response.json(proxyError(status, pathname, requestId), {
      status,
      headers: { [REQUEST_ID_HEADER]: requestId },
    });
  }

  const empty = request.method === 'HEAD' || upstream.status === 204 || upstream.status === 304;
  return new Response(empty ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream.headers),
  });
}

export { proxy as DELETE, proxy as GET, proxy as HEAD, proxy as PATCH, proxy as POST };
