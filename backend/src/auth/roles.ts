import { Role } from '../generated/prisma/enums';

export { Role };

// Perfis em ordem crescente de poder: cada um pode tudo o que os anteriores podem (ADR 012)
const RANK: Record<Role, number> = { READER: 0, EDITOR: 1, ADMIN: 2 };

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  READER: 'Leitor',
};

/** O perfil alcança o mínimo exigido? */
export function hasRole(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}
