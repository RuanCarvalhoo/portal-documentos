'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { NavigationSpace } from '@/lib/types';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface AppShellProps {
  navigation: NavigationSpace[] | null;
  children: React.ReactNode;
}

/** Layout do wireframe: header fixo, sidebar global (drawer no mobile) e conteúdo. */
export function AppShell({ navigation, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Mudou de rota (inclusive pelo Voltar do navegador): fecha o drawer.
  // Ajuste de estado durante o render, o padrão do React para isso (sem efeito).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <Header menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(!menuOpen)} />

      {menuOpen && (
        <div className="fixed inset-0 z-10 bg-overlay md:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      {/* Fechado no mobile: além de sair da tela, fica invisible para sair do foco do teclado */}
      <aside
        id="sidebar"
        className={`fixed top-14 bottom-0 left-0 z-20 w-72 overflow-y-auto border-r border-border bg-background transition-[translate,visibility] motion-reduce:transition-none md:visible md:translate-x-0 ${menuOpen ? 'translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <Sidebar navigation={navigation} />
      </aside>

      <main id="conteudo" tabIndex={-1} className="pt-14 outline-none md:pl-72">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-10 sm:py-14">{children}</div>
      </main>
    </>
  );
}
