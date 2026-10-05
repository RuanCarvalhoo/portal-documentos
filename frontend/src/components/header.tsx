'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent } from 'react';
import { confirmLeave } from '@/lib/unsaved';
import { useAuth } from './auth-provider';
import { CloseIcon, LogoIcon, MenuIcon, SearchIcon } from './icons';
import { ThemeToggle } from './theme-toggle';

interface HeaderProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
}

export function Header({ menuOpen, onToggleMenu }: HeaderProps) {
  const router = useRouter();

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q')?.toString().trim();
    // Navega sem link (router.push): o aviso de texto não salvo não pegaria sozinho
    if (q && confirmLeave()) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-full items-center gap-2 px-3 sm:gap-4 sm:px-5">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-controls="portal-sidebar"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'}
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-hover hover:text-foreground pointer-coarse:size-11 md:hidden"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <Link href="/" className="flex h-9 min-w-9 shrink-0 items-center justify-center gap-2 text-foreground">
          <LogoIcon />
          <span className="font-serif text-lg tracking-tight max-[400px]:sr-only">Documentação</span>
        </Link>

        {/* action="/search": a busca funciona até sem JavaScript */}
        {/* Telas estreitas: o campo não cabe com folga no header; a busca abre a página dela */}
        <Link
          href="/search"
          aria-label="Buscar"
          className="ml-auto grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-hover hover:text-foreground pointer-coarse:size-11 sm:hidden"
        >
          <SearchIcon />
        </Link>
        <form
          action="/search"
          role="search"
          aria-label="Buscar na documentação"
          onSubmit={search}
          className="ml-auto hidden w-full max-w-xs sm:block"
        >
          <label htmlFor="portal-busca" className="sr-only">
            Buscar na documentação
          </label>
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-muted focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-accent-fg/30">
            <SearchIcon className="shrink-0" />
            <input
              id="portal-busca"
              name="q"
              type="search"
              placeholder="Buscar..."
              minLength={3}
              required
              className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
          </div>
        </form>

        <ThemeToggle />
        <UserArea />
      </div>
    </header>
  );
}

function UserArea() {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  // Depois de entrar, volta para onde estava (exceto das próprias telas de acesso)
  const loginHref =
    pathname === '/login' || pathname === '/register'
      ? '/login'
      : `/login?next=${encodeURIComponent(pathname)}`;
  if (!ready) {
    // Reserva o espaço enquanto descobre se há sessão: o header não "pula"
    return <span className="h-8 w-16 shrink-0" aria-hidden="true" />;
  }
  if (!user) {
    return (
      <Link
        href={loginHref}
        className="inline-flex h-9 shrink-0 items-center rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        Entrar
      </Link>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-2 text-sm">
      <span className="hidden max-w-36 truncate text-muted sm:inline" title={user.email}>
        {user.name}
      </span>
      <button
        type="button"
        onClick={() => confirmLeave() && logout()}
        className="h-9 rounded-md border border-border px-3 text-muted transition-colors hover:bg-hover hover:text-foreground"
      >
        Sair
      </button>
    </div>
  );
}
