// Mesmo teto de página da API (acima disso ela responde 400)
export const MAX_PAGE = 100_000;

/** Página pedida na URL (?page=), entre 1 e MAX_PAGE; ausente ou inválida vira 1. */
export function pageParam(value: string | string[] | undefined): number {
  const requested = Number.parseInt(typeof value === 'string' ? value : '1', 10) || 1;
  return Math.min(MAX_PAGE, Math.max(1, requested));
}

/** Quantidade de páginas para `total` itens (no mínimo 1, mesmo sem itens). */
export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
