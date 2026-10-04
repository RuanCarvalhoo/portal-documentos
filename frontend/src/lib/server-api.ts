import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ApiError, apiFetch } from './api';
import type { NavigationSpace } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Leitura em Server Component de um recurso por id. Só ids no formato uuid chegam à API:
 * um parâmetro como "..%2Fauth%2Fme" não pode virar outro caminho. Id inexistente → 404.
 */
export async function getOrNotFound<T>(resource: 'spaces' | 'pages', id: string): Promise<T> {
  if (!UUID.test(id)) {
    notFound();
  }
  try {
    return await apiFetch<T>(`/${resource}/${id}`);
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
    return await apiFetch<NavigationSpace[]>('/navigation', { timeoutMs: 5_000 });
  } catch (error) {
    console.error('Falha ao carregar a navegação', error);
    return null;
  }
});
