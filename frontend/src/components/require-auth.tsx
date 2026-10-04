'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';

/** Telas de escrita: só para quem está logado. A proteção real é a API (401). */
export function RequireAuth({ children }: { children: React.ReactNode }) {
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
  return children;
}

/** Ações de escrita (criar, editar, excluir) só aparecem para quem está logado. */
export function AuthOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? children : null;
}
