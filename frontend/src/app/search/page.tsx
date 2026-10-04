import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pager } from '@/components/pager';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { highlightParts } from '@/lib/highlight';
import { pageParam, totalPages as countPages } from '@/lib/pagination';
import type { Paginated, SearchResult } from '@/lib/types';

const PAGE_SIZE = 10;

export async function generateMetadata({ searchParams }: PageProps<'/search'>): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: typeof q === 'string' && q.trim() ? `Busca: ${q.trim()}` : 'Busca' };
}

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const page = pageParam(params.page);

  let results: Paginated<SearchResult> | null = null;
  let errors: string[] = [];
  if (q) {
    try {
      const query = new URLSearchParams({ q, page: String(page), limit: String(PAGE_SIZE) });
      results = await apiFetch<Paginated<SearchResult>>(`/search?${query}`);
    } catch (error) {
      // 400 (termo curto/sem letras), 429 (muitas buscas): a mensagem da API orienta a pessoa
      errors = error instanceof ApiError ? error.messages : ['Não foi possível buscar agora.'];
    }
  }
  const totalPages = results ? countPages(results.meta.total, PAGE_SIZE) : 1;
  const pageHref = (target: number) => `/search?${new URLSearchParams({ q, page: String(target) })}`;
  // Página além do fim (link antigo, URL editada): leva para a última página com resultados
  if (results && results.data.length === 0 && results.meta.total > 0) {
    redirect(pageHref(totalPages));
  }

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Busca</h1>
      <form action="/search" role="search" aria-label="Refinar a busca" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="busca-pagina" className="sr-only">
          Termo da busca
        </label>
        <input
          id="busca-pagina"
          name="q"
          type="search"
          // key: uma nova busca pelo header recria o campo com o termo atual
          key={q}
          defaultValue={q}
          placeholder="Título ou conteúdo (mínimo 3 letras)"
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-foreground/40 focus:ring-2 focus:ring-accent-fg/25"
        />
        <button type="submit" className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background">
          Buscar
        </button>
      </form>

      <div role="status" className="mt-8">
        {!q && <p className="text-muted">Digite um termo para buscar no título e no conteúdo das páginas.</p>}
        {errors.length > 0 && <p className="text-danger-fg">{errors.join(' ')}</p>}
        {results && (
          <p className="text-sm text-muted">
            {results.meta.total === 0
              ? `Nenhuma página encontrada para "${q}".`
              : `${results.meta.total} ${results.meta.total === 1 ? 'página encontrada' : 'páginas encontradas'} para "${q}".`}
          </p>
        )}
      </div>

      {results && results.data.length > 0 && (
        <ol role="list" className="mt-4 divide-y divide-border border-y border-border">
          {results.data.map((hit) => (
            <li key={hit.id} className="py-5">
              <p className="text-xs text-muted">{hit.spaceName}</p>
              <Link href={`/pages/${hit.id}`} className="mt-0.5 block font-serif text-xl tracking-tight hover:underline">
                <Highlighted text={hit.title} term={q} />
              </Link>
              {hit.snippet && (
                <p className="mt-1.5 text-sm text-muted">
                  <Highlighted text={hit.snippet} term={q} />
                </p>
              )}
              <p className="mt-1.5 text-xs text-muted">
                Atualizada em <time dateTime={hit.updatedAt}>{formatDateTime(hit.updatedAt)}</time>
              </p>
            </li>
          ))}
        </ol>
      )}

      <Pager label="Páginas de resultados" page={page} totalPages={totalPages} href={pageHref} />
    </div>
  );
}

function Highlighted({ text, term }: { text: string; term: string }) {
  return highlightParts(text, term).map((part, index) =>
    part.match ? (
      <mark key={index} className="rounded-sm bg-accent-bg px-0.5 text-accent-fg">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}
