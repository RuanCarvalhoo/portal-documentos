import { timingSafeEqual } from 'node:crypto';

/** Cabeçalhos que o servidor do frontend envia ao chamar a API em nome de quem pediu a página. */
export const CLIENT_IP_HEADER = 'x-portal-client-ip';
export const PROXY_SECRET_HEADER = 'x-portal-proxy-secret';

interface IncomingRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * IP que identifica o cliente no rate limit. As leituras renderizadas no servidor do Next
 * chegam à API todas com o IP do container do frontend; ele repassa o IP de quem pediu a página
 * junto com um segredo compartilhado. Sem o segredo certo o cabeçalho é ignorado: senão qualquer
 * um escolheria o próprio IP a cada requisição e furaria o limite.
 */
export function clientIpOf(request: IncomingRequest, proxySecret: string | undefined): string {
  const forwarded = request.headers[CLIENT_IP_HEADER];
  // Segredo vazio conta como "sem segredo": senão um cabeçalho vazio bateria com ele
  const fromWebServer = !!proxySecret && sameSecret(request.headers[PROXY_SECRET_HEADER], proxySecret);
  if (fromWebServer && typeof forwarded === 'string' && forwarded !== '') {
    return forwarded;
  }
  return request.ip ?? '';
}

// Comparação em tempo constante: o tempo de resposta não revela quantos caracteres acertaram
function sameSecret(received: string | string[] | undefined, expected: string): boolean {
  if (typeof received !== 'string') {
    return false;
  }
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
