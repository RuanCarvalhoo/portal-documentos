import type { Role } from './types';

/**
 * Perfis em ordem crescente: cada um pode o que os anteriores podem (ADR 012). Aqui só decide o
 * que a interface mostra; quem garante a regra é a API (403).
 */
export const ROLES: readonly Role[] = ['READER', 'EDITOR', 'ADMIN'];

export const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', EDITOR: 'Editor', READER: 'Leitor' };

/** O usuário (ou a falta dele) alcança o perfil mínimo? */
export function hasRole(user: { role: Role } | null | undefined, minimum: Role): boolean {
  return !!user && ROLES.indexOf(user.role) >= ROLES.indexOf(minimum);
}
