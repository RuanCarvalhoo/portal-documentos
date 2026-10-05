export interface Env {
  DATABASE_URL: string;
  PORT: number;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
  /** Segredo compartilhado com o frontend para repassar o IP do cliente (opcional) */
  INTERNAL_API_SECRET?: string;
}

const MAX_PORT = 65_535;
const MIN_SECRET_LENGTH = 32;

/** Valida o ambiente no boot (falha cedo) e aplica os padrões de desenvolvimento. */
export function validateEnv(raw: Record<string, unknown>): Env & Record<string, unknown> {
  const {
    DATABASE_URL,
    PORT = '3001',
    CORS_ORIGIN = 'http://localhost:3000',
    JWT_SECRET,
    INTERNAL_API_SECRET,
  } = raw;

  if (typeof DATABASE_URL !== 'string' || DATABASE_URL === '') {
    throw new Error('Variável de ambiente obrigatória ausente: DATABASE_URL');
  }
  return {
    ...raw,
    DATABASE_URL,
    PORT: parsePort(PORT),
    CORS_ORIGIN: parseOrigin(CORS_ORIGIN),
    JWT_SECRET: parseSecret('JWT_SECRET', JWT_SECRET),
    // Opcional: sem ele, o IP repassado pelo frontend é ignorado e o rate limit usa o IP da conexão
    INTERNAL_API_SECRET:
      INTERNAL_API_SECRET === undefined || INTERNAL_API_SECRET === ''
        ? undefined
        : parseSecret('INTERNAL_API_SECRET', INTERNAL_API_SECRET),
  };
}

function parsePort(value: unknown): number {
  const text = String(value);
  const port = Number(text);
  if (!/^\d+$/.test(text) || port < 1 || port > MAX_PORT) {
    throw new Error(`Variável de ambiente PORT inválida: ${text}`);
  }
  return port;
}

// Origem exata (esquema + host + porta). No pacote cors, vazio vira "*" e uma barra final
// nunca casa com o header Origin — os dois falhariam em silêncio.
function parseOrigin(value: unknown): string {
  const text = String(value);
  if (!URL.canParse(text) || new URL(text).origin !== text) {
    throw new Error(
      `Variável de ambiente CORS_ORIGIN inválida (use uma origem como http://localhost:3000): ${text}`,
    );
  }
  return text;
}

// Segredo curto é quebrável por força bruta (offline, no caso do JWT, a partir de um único token)
function parseSecret(name: string, value: unknown): string {
  if (typeof value !== 'string' || value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Variável de ambiente ${name} ausente ou curta demais (mínimo ${MIN_SECRET_LENGTH} caracteres)`,
    );
  }
  return value;
}
