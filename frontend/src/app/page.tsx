import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusIcon } from '@/components/icons';
import { Pager } from '@/components/pager';
import { AuthOnly } from '@/components/require-auth';
import { secondaryButton } from '@/components/ui';
import { pageParam, totalPages } from '@/lib/pagination';
import { getNavigation, serverFetch } from '@/lib/server-api';
import { countPages } from '@/lib/tree';
import type { Paginated, Space } from '@/lib/types';

const PAGE_SIZE = 20;

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const page = pageParam((await searchParams).page);
  const [spaces, navigation] = await Promise.all([
    serverFetch<Paginated<Space>>(`/spaces?page=${page}&limit=${PAGE_SIZE}`).catch(() => null),
    getNavigation(),
  ]);
  const pages = spaces ? totalPages(spaces.meta.total, PAGE_SIZE) : 1;
  const pageHref = (target: number) => (target === 1 ? '/' : `/?page=${target}`);
  // Página além do fim (link antigo, espaços excluídos): leva para a última página
  if (spaces && spaces.data.length === 0 && spaces.meta.total > 0) {
    redirect(pageHref(pages));
  }
  // Sem a navegação (API instável) a contagem seria "0 páginas" para todos: melhor omitir
  const pageCount = navigation && new Map(navigation.map((space) => [space.id, countPages(space.pages)]));

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Documentação</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Guias, decisões e referências do time, organizados em espaços. Navegue pela barra lateral ou busque uma
        página pelo título ou pelo conteúdo.
      </p>

      <div className="mt-14 flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 className="font-serif text-2xl tracking-tight">Espaços</h2>
        <AuthOnly>
          <Link href="/spaces/new" className={secondaryButton}>
            <PlusIcon /> Novo espaço
          </Link>
        </AuthOnly>
      </div>

      {spaces === null ? (
        <p className="mt-6 text-muted">Não foi possível carregar os espaços agora. Tente recarregar a página.</p>
      ) : spaces.data.length === 0 ? (
        <p className="mt-6 text-muted">Nenhum espaço criado ainda.</p>
      ) : (
        <ul role="list" className="divide-y divide-border">
          {spaces.data.map((space) => {
            const total = pageCount?.get(space.id) ?? 0;
            return (
              <li key={space.id}>
                <Link
                  href={`/spaces/${space.id}`}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                >
                  <span>
                    <span className="font-serif text-xl tracking-tight group-hover:underline group-hover:underline-offset-4">
                      {space.name}
                    </span>
                    {space.description && <span className="mt-1 block text-sm text-muted">{space.description}</span>}
                  </span>
                  {pageCount && (
                    <span className="shrink-0 text-sm text-muted tabular-nums">
                      {total === 1 ? '1 página' : `${total} páginas`}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pager label="Páginas de espaços" page={page} totalPages={pages} href={pageHref} />
    </div>
  );
}
