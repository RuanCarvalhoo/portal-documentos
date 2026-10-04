/**
 * Destino seguro após o login: só caminhos internos. Bloqueia open redirect
 * (`//site.com`, `/\site.com`, `https://...`), que levaria a pessoa para fora do portal.
 */
export function safeRedirect(target: string | null | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return '/';
  }
  return target;
}
