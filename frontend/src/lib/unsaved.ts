const DISCARD_MESSAGE = 'Há alterações não salvas. Sair e descartá-las?';

// Um formulário editável por vez: o estado vive no módulo para o header (botão Sair) consultar
let unsaved = false;

export function setUnsaved(value: boolean): void {
  unsaved = value;
}

export function hasUnsaved(): boolean {
  return unsaved;
}

/** true se pode sair: não há alterações pendentes ou a pessoa aceitou descartá-las. */
export function confirmLeave(): boolean {
  if (unsaved && !window.confirm(DISCARD_MESSAGE)) {
    return false;
  }
  // Aceitou: o beforeunload da navegação que vem a seguir não pergunta de novo
  unsaved = false;
  return true;
}

interface LinkInfo {
  href: string;
  target: string;
  hasDownload: boolean;
}

/**
 * Diz se o clique num link tira esta aba da página atual dentro do portal. Fora daqui:
 * clique com modificador ou com outro botão, nova aba, download, âncora da própria página e
 * links para outros sites (esses o navegador já confirma pelo beforeunload).
 */
export function leavesPage(link: LinkInfo, click: { button: number; modified: boolean }, current: string): boolean {
  if (click.button !== 0 || click.modified || link.hasDownload || (link.target !== '' && link.target !== '_self')) {
    return false;
  }
  const destination = new URL(link.href, current);
  const here = new URL(current);
  if (destination.origin !== here.origin) {
    return false;
  }
  const samePage = destination.pathname === here.pathname && destination.search === here.search;
  return !(samePage && destination.hash !== '');
}
