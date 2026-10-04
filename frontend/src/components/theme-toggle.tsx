'use client';

import { THEME_KEY } from '@/lib/theme';
import { MoonIcon, SunIcon } from './icons';

/** Alterna claro/escuro. O ícone certo aparece via CSS (classe .dark), sem estado: nada pisca. */
export function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // Armazenamento bloqueado: o tema vale só para esta visita
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro ou escuro"
      title="Alternar tema"
      className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground"
    >
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </button>
  );
}
