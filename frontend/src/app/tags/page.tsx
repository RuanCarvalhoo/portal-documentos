import type { Metadata } from 'next';
import Link from 'next/link';
import { Pager } from '@/components/pager';
import { pageParam, totalPages as countPages } from '@/lib/pagination';
import { serverFetch } from '@/lib/server-api';
import { tagHref } from '@/lib/tags';
import type { Paginated, TagSummary } from '@/lib/types';

export const metadata: Metadata = { title: 'Tags' };

const PAGE_SIZE = 50;

export default async function TagsPage({ searchParams }: PageProps<'/tags'>) {
  const page = pageParam((await searchParams).page);
  const tags = await serverFetch<Paginated<TagSummary>>(`/tags?page=${page}&limit=${PAGE_SIZE}`).catch(
    () => null,
  );

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Tags</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Assuntos que atravessam os espaços. Cada página pode ter até 10 tags, definidas no editor.
      </p>

      {tags === null ? (
        <p className="mt-8 text-muted">Não foi possível carregar as tags agora. Tente recarregar.</p>
      ) : tags.data.length === 0 ? (
        <p className="mt-8 text-muted">Nenhuma página tem tags ainda.</p>
      ) : (
        <ul role="list" className="mt-8 flex flex-wrap gap-2">
          {tags.data.map(({ name, pageCount }) => (
            <li key={name}>
              <Link
                href={tagHref(name)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-hover"
              >
                <span className="text-accent-fg">#{name}</span>
                <span className="text-xs text-muted" aria-label={`${pageCount} páginas`}>
                  {pageCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tags && (
        <Pager
          label="Páginas de tags"
          page={page}
          totalPages={countPages(tags.meta.total, PAGE_SIZE)}
          href={(target) => `/tags?page=${target}`}
        />
      )}
    </div>
  );
}
