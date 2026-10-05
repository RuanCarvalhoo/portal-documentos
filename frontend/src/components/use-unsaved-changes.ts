'use client';

import { useEffect } from 'react';
import { confirmLeave, hasUnsaved, leavesPage, setUnsaved } from '@/lib/unsaved';

/**
 * Avisa antes de descartar um formulário alterado: ao recarregar ou fechar a aba (beforeunload)
 * e ao clicar num link do portal (barra lateral, Cancelar, header). O Voltar do navegador não é
 * interceptável no App Router.
 */
export function useUnsavedChangesWarning(dirty: boolean): void {
  useEffect(() => {
    setUnsaved(dirty);
    if (!dirty) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsaved()) {
        event.preventDefault();
      }
    };
    // Fase de captura: decide antes do onClick do <Link>, que navegaria sem perguntar
    const guardLinks = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const leaving = leavesPage(
        { href: link.href, target: link.target, hasDownload: link.hasAttribute('download') },
        { button: event.button, modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey },
        window.location.href,
      );
      if (leaving && !confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    document.addEventListener('click', guardLinks, true);
    return () => {
      setUnsaved(false);
      window.removeEventListener('beforeunload', warnBeforeUnload);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [dirty]);
}
