export interface Env {
  DATABASE_URL: string;
  PORT: number;
  CORS_ORIGIN: string;
}

/** Valida o ambiente no boot (falha cedo) e aplica os padrões de desenvolvimento. */
export function validateEnv(raw: Record<string, unknown>): Env & Record<string, unknown> {
  const { DATABASE_URL, PORT = '3001', CORS_ORIGIN = 'http://localhost:3000' } = raw;

  if (typeof DATABASE_URL !== 'string' || DATABASE_URL === '') {
    throw new Error('Variável de ambiente obrigatória ausente: DATABASE_URL');
  }
  const port = Number(PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Variável de ambiente PORT inválida: ${String(PORT)}`);
  }

  return { ...raw, DATABASE_URL, PORT: port, CORS_ORIGIN: String(CORS_ORIGIN) };
}
