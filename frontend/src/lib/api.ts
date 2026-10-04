import type { NavigationSpace } from './types';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// No servidor (Server Components dentro do Docker) a API é o serviço "backend" da rede interna;
// no navegador, só a URL publicada no host funciona.
function baseUrl(): string {
  return typeof window === 'undefined' ? (process.env.API_URL ?? PUBLIC_API_URL) : PUBLIC_API_URL;
}

/** Erro da API já com as mensagens do envelope `{ statusCode, message, ... }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join('\n'));
    this.status = status;
    this.messages = messages;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  let response: Response;
  try {
    response = await fetch(baseUrl() + path, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Dados sempre atuais: a documentação muda a cada edição
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, ['Não foi possível conectar à API. Tente novamente em instantes.']);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, messagesOf(data));
  }
  return data as T;
}

function messagesOf(data: unknown): string[] {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const { message } = data;
    if (typeof message === 'string') {
      return [message];
    }
    if (Array.isArray(message)) {
      return message.map(String);
    }
  }
  return ['Erro inesperado. Tente novamente.'];
}

/** Navegação da sidebar (Server Component). null se a API estiver indisponível. */
export async function getNavigation(): Promise<NavigationSpace[] | null> {
  try {
    return await apiFetch<NavigationSpace[]>('/navigation');
  } catch (error) {
    console.error('Falha ao carregar a navegação', error);
    return null;
  }
}
