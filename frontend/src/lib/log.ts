type Level = 'info' | 'warn' | 'error';

/**
 * Log do servidor do Next em JSON, uma linha por evento, no mesmo formato de campos da API
 * (level, time, msg, requestId...): os dois lados podem ir para o mesmo coletor e ser cruzados
 * pelo requestId. Só para código que roda no servidor.
 */
export function logEvent(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, time: new Date().toISOString(), service: 'frontend', msg, ...fields });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/** Erro em um formato que cabe no JSON (Error não serializa os próprios campos). */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? `: ${error.cause.message}` : '';
    return `${error.name}: ${error.message}${cause}`;
  }
  return String(error);
}
