'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  // O drawer fica aberto só na rota em que foi aberto: navegar fecha sem precisar de efeito
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <Header menuOpen={menuOpen} onToggleMenu={() => setOpenOn(menuOpen ? null : pathname)} />

      {menuOpen && (
        <div className="fixed inset-0 z-10 bg-black/20 md:hidden" onClick={() => setOpenOn(null)} aria-hidden="true" />
      )}
      <aside
        id="sidebar"
        className={`fixed top-14 bottom-0 left-0 z-20 w-72 overflow-y-auto border-r border-border bg-background transition-transform md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar navigation={navigation} />
      </aside>

      <main id="conteudo" className="pt-14 md:pl-72">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-10 sm:py-14">{children}</div>
      </main>
    </>
  );
}
