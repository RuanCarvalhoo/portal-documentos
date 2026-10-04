import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import { AuthOnly } from '@/components/require-auth';
import { secondaryButton } from '@/components/ui';
import { getNavigation } from '@/lib/api';
import { countPages } from '@/lib/tree';

export default async function HomePage() {
  const navigation = await getNavigation();

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Documentação</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Guias, decisões e referências do time, organizados em espaços. Use a barra lateral para navegar ou a
        busca para encontrar uma página pelo título ou pelo conteúdo.
      </p>

      <div className="mt-12 flex items-center justify-between gap-4">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Espaços</h2>
        <AuthOnly>
          <Link href="/spaces/new" className={secondaryButton}>
            <PlusIcon /> Novo espaço
          </Link>
        </AuthOnly>
      </div>
      {navigation === null ? (
        <p className="mt-4 text-muted">Não foi possível carregar os espaços agora. Tente recarregar a página.</p>
      ) : navigation.length === 0 ? (
        <p className="mt-4 text-muted">Nenhum espaço criado ainda.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {navigation.map((space) => {
            const total = countPages(space.pages);
            return (
              <li key={space.id}>
                <Link
                  href={`/spaces/${space.id}`}
                  className="block h-full rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <span className="font-serif text-xl tracking-tight">{space.name}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {total === 1 ? '1 página' : `${total} páginas`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
