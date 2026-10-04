// Origem fictícia só para o parser de URL resolver caminhos relativos
const ORIGIN = 'http://portal.invalid';
// Voltar para a própria tela de acesso depois de entrar criaria um laço
const AUTH_PAGES = new Set(['/login', '/register']);

/**
 * Destino seguro após o login: só caminhos internos. Bloqueia open redirect, que levaria a
 * pessoa para outro site depois de digitar a senha: `//site.com`, `/\site.com`, URLs absolutas e
 * variantes com caracteres de controle (o parser de URL descarta tab/quebra de linha, então
 * "/<tab>/site.com" viraria "//site.com").
 */
export function safeRedirect(target: string | null | undefined): string {
  if (!target || !target.startsWith('/') || hasControlOrBackslash(target)) {
    return '/';
  }
  let url: URL;
  try {
    url = new URL(target, ORIGIN);
  } catch {
    return '/';
  }
  if (url.origin !== ORIGIN || AUTH_PAGES.has(url.pathname)) {
    return '/';
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function hasControlOrBackslash(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) < 0x20 || char === '\\');
}
