import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/components/auth-provider';
import { getNavigation } from '@/lib/api';
import { THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Documentação', template: '%s · Documentação' },
  description: 'Portal de documentação: espaços, páginas em Markdown e busca.',
};

// A navegação vem da API a cada requisição. Sem isto, o `next build` (no Docker, sem API no ar)
// tentaria pré-renderizar as páginas e buscar os dados durante o build.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const navigation = await getNavigation();

  return (
    <html
      lang="pt-BR"
      // O script de tema muda a classe do <html> antes da hidratação
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AuthProvider>
          <AppShell navigation={navigation}>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
