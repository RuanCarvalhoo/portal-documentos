'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasRole, ROLE_LABELS } from '@/lib/permissions';
import type { Role } from '@/lib/types';
import { useAuth } from './auth-provider';

interface GateProps {
  children: React.ReactNode;
  /** Perfil mínimo; sem ele, basta estar logado */
  role?: Role;
}

/** Telas de escrita: só para quem está logado e tem o perfil. A proteção real é a API (401/403). */
export function RequireAuth({ children, role = 'READER' }: GateProps) {
  const { user, ready } = useAuth();
  const pathname = usePathname();

  if (!ready) {
    return <p className="text-sm text-muted">Carregando...</p>;
  }
  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p>Você precisa entrar para continuar.</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Entrar
        </Link>
      </div>
    );
  }
  if (!hasRole(user, role)) {
    return (
      <div role="note" className="rounded-lg border border-border bg-surface p-6">
        <p>
          Seu perfil ({ROLE_LABELS[user.role]}) não permite esta ação. Ela exige o perfil{' '}
          {ROLE_LABELS[role]}: peça acesso a um administrador.
        </p>
      </div>
    );
  }
  return children;
}

/** Ações de escrita (criar, editar, excluir) só aparecem para quem tem o perfil. */
export function AuthOnly({ children, role = 'READER' }: GateProps) {
  const { user } = useAuth();
  return hasRole(user, role) ? children : null;
}
