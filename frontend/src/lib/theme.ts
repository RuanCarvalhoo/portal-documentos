// Fora de módulos 'use client': o layout (Server Component) precisa do valor real da chave
export const THEME_KEY = 'portal-docs:theme';

/** Roda antes da primeira pintura: aplica o tema salvo ou o do sistema, sem piscar. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;
