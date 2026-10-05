import { isIP } from 'node:net';

/**
 * IP de quem pediu a página, a partir do X-Forwarded-For: o último da lista, que é o que o
 * proxy mais próximo acrescentou (os anteriores podem ter vindo do próprio cliente). Sem proxy,
 * o Next preenche o cabeçalho com o IP da conexão. Qualquer coisa que não seja um IP vira null.
 */
export function lastForwardedIp(header: string | null): string | null {
  const last = header?.split(',').at(-1)?.trim() ?? '';
  return isIP(last) ? last : null;
}
