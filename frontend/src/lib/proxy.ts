/**
 * Proxy do navegador para a API (rota `/api/[...path]`). O navegador só conversa com a origem do
 * portal; o servidor do Next repassa a chamada para a API pela rede interna. Assim não há CORS,
 * nem URL da API embutida no bundle, nem porta 3001 que o navegador precise alcançar.
 * Aqui fica a parte pura (testada); a rota em si está em app/api/[...path]/route.ts.
 */

/** Prefixo das chamadas do navegador: `/api/spaces` vira `GET {API_URL}/spaces`. */
export const PROXY_PREFIX = '/api';

export const REQUEST_ID_HEADER = 'x-request-id';
// Os mesmos nomes de backend/src/common/client-ip.ts
const CLIENT_IP_HEADER = 'x-portal-client-ip';
const PROXY_SECRET_HEADER = 'x-portal-proxy-secret';

// Só o que a API usa. O resto (cookies, x-portal-* forjados pelo cliente, hop-by-hop) não passa.
const FORWARDED_REQUEST_HEADERS = ['accept', 'authorization', 'content-type', 'if-none-match'];
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-type',
  'etag',
  'last-modified',
  'retry-after',
  REQUEST_ID_HEADER,
];

const REQUEST_ID = /^[\w-]{1,64}$/;

/**
 * URL da API para um caminho recebido em `/api/...`, ou null se ele não for do proxy.
 * Concatena em vez de usar `new URL(caminho, base)`: com `/api//site.com` o segundo trataria
 * `//site.com` como outro host. A origem é conferida no fim, por garantia.
 */
export function upstreamUrl(base: string, pathname: string, search: string): string | null {
  if (!pathname.startsWith(`${PROXY_PREFIX}/`)) {
    return null;
  }
  const origin = new URL(base).origin;
  const target = new URL(origin + pathname.slice(PROXY_PREFIX.length) + search);
  return target.origin === origin ? target.href : null;
}

/** Id da requisição: o recebido, se tiver um formato seguro para ir ao log, ou um novo. */
export function requestIdOf(header: string | null): string {
  return header && REQUEST_ID.test(header) ? header : crypto.randomUUID();
}

interface ForwardingOptions {
  requestId: string;
  /** IP de quem chamou o portal (último item do X-Forwarded-For) */
  clientIp: string | null;
  /** INTERNAL_API_SECRET: sem ele, a API usa o IP da conexão (o do servidor do Next) */
  secret?: string;
}

/** Cabeçalhos repassados à API: a allowlist, o id da requisição e o IP do cliente. */
export function forwardHeaders(incoming: Headers, { requestId, clientIp, secret }: ForwardingOptions): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  headers.set(REQUEST_ID_HEADER, requestId);
  // Sem isso o rate limit de login e escritas valeria para todos os visitantes juntos
  if (secret && clientIp) {
    headers.set(CLIENT_IP_HEADER, clientIp);
    headers.set(PROXY_SECRET_HEADER, secret);
  }
  return headers;
}

/** Cabeçalhos da resposta da API devolvidos ao navegador. */
export function responseHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  // O fetch já descomprime o corpo: o tamanho original só vale se não havia compressão
  const length = upstream.get('content-length');
  if (length !== null && upstream.get('content-encoding') === null) {
    headers.set('content-length', length);
  }
  return headers;
}

/** Erro do próprio proxy no mesmo formato dos erros da API (o frontend lê `message`). */
export function proxyError(status: 400 | 502 | 504, path: string, requestId: string) {
  const details = {
    400: ['Bad Request', 'Requisição inválida'],
    502: ['Bad Gateway', 'Não foi possível conectar à API. Tente novamente em instantes.'],
    504: ['Gateway Timeout', 'A API demorou demais para responder. Tente novamente em instantes.'],
  } as const;
  const [error, message] = details[status];
  return { statusCode: status, error, message, path, requestId, timestamp: new Date().toISOString() };
}
