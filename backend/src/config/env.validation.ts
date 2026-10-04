export interface Env {
  DATABASE_URL: string;
  PORT: number;
  CORS_ORIGIN: string;
}

const MAX_PORT = 65_535;

/** Valida o ambiente no boot (falha cedo) e aplica os padrões de desenvolvimento. */
export function validateEnv(raw: Record<string, unknown>): Env & Record<string, unknown> {
  const { DATABASE_URL, PORT = '3001', CORS_ORIGIN = 'http://localhost:3000' } = raw;

  if (typeof DATABASE_URL !== 'string' || DATABASE_URL === '') {
    throw new Error('Variável de ambiente obrigatória ausente: DATABASE_URL');
  }
  return { ...raw, DATABASE_URL, PORT: parsePort(PORT), CORS_ORIGIN: parseOrigin(CORS_ORIGIN) };
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
