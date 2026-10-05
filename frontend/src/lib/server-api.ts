import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ApiError, apiFetch, type RequestOptions } from './api';
import { lastForwardedIp } from './forwarded-for';
import type { NavigationSpace } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * apiFetch a partir do servidor do Next. Para a API, toda leitura renderizada aqui viria do IP
 * do container do frontend, e o rate limit (da busca, por exemplo) valeria para todo mundo junto.
 * Então repassa o IP de quem pediu a página, com o segredo compartilhado que prova à API que é o
 * frontend falando. Sem INTERNAL_API_SECRET configurado, não repassa nada.
 */
export async function serverFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const secret = process.env.INTERNAL_API_SECRET;
  const clientIp = lastForwardedIp((await headers()).get('x-forwarded-for'));
  const forwarding =
    secret && clientIp ? { 'x-portal-client-ip': clientIp, 'x-portal-proxy-secret': secret } : undefined;
  return apiFetch<T>(path, { ...options, headers: { ...options.headers, ...forwarding } });
}

/**
 * Leitura em Server Component de um recurso por id. Só ids no formato uuid chegam à API:
 * um parâmetro como "..%2Fauth%2Fme" não pode virar outro caminho. Id inexistente → 404.
 */
export async function getOrNotFound<T>(resource: 'spaces' | 'pages', id: string): Promise<T> {
  if (!UUID.test(id)) {
    notFound();
  }
  try {
    return await serverFetch<T>(`/${resource}/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

/**
 * Navegação da sidebar, null se a API estiver indisponível. cache(): o layout e a página
 * pedem a mesma navegação numa única chamada por requisição.
 */
export const getNavigation = cache(async (): Promise<NavigationSpace[] | null> => {
  try {
    // Com teto: o layout de toda rota espera a navegação, então uma API lenta não pode travar o site
    return await serverFetch<NavigationSpace[]>('/navigation', { timeoutMs: 5_000 });
  } catch (error) {
    console.error('Falha ao carregar a navegação', error);
    return null;
  }
});
