import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pager } from '@/components/pager';
import { formatDateTime } from '@/lib/format';
import { pageParam, totalPages } from '@/lib/pagination';
import { getPage, getPageVersions, VERSIONS_PAGE_SIZE } from '../../get-page';

export async function generateMetadata({ params }: PageProps<'/pages/[id]/versions'>): Promise<Metadata> {
  const { id } = await params;
  return { title: `Histórico de ${(await getPage(id)).title}` };
}

export default async function PageHistory({ params, searchParams }: PageProps<'/pages/[id]/versions'>) {
  const { id } = await params;
  const page = pageParam((await searchParams).page);
  const [current, versions] = await Promise.all([getPage(id), getPageVersions(id, page)]);
  const pages = totalPages(versions.meta.total, VERSIONS_PAGE_SIZE);
  const pageHref = (target: number) => `/pages/${id}/versions${target === 1 ? '' : `?page=${target}`}`;
  // Página além do fim (link antigo): leva para a última
  if (versions.data.length === 0 && versions.meta.total > 0) {
    redirect(pageHref(pages));
  }

  return (
    <div>
      <Link href={`/pages/${id}`} className="inline-block py-1 text-sm text-muted hover:text-foreground">
        ← {current.title}
      </Link>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Histórico de versões</h1>
      <p className="mt-3 max-w-2xl text-muted">
        A cada edição do título ou do conteúdo, o texto anterior é guardado aqui. Abra uma versão para lê-la
        ou restaurá-la.
      </p>

      <ol role="list" className="mt-10 divide-y divide-border border-y border-border">
        {page === 1 && (
          <li className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
            <span>
              <Link href={`/pages/${id}`} className="font-medium hover:underline">
                Versão atual
              </Link>
              <span className="ml-2 text-sm text-muted">{current.title}</span>
            </span>
            <span className="shrink-0 text-sm text-muted">
              {current.updatedBy.name} · <time dateTime={current.updatedAt}>{formatDateTime(current.updatedAt)}</time>
            </span>
          </li>
        )}
        {versions.data.map((version) => (
          <li
            key={version.version}
            className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
          >
            <span>
              <Link href={`/pages/${id}/versions/${version.version}`} className="font-medium hover:underline">
                Versão {version.version}
              </Link>
              <span className="ml-2 text-sm text-muted">{version.title}</span>
            </span>
            <span className="shrink-0 text-sm text-muted">
              {version.editedBy.name} · <time dateTime={version.editedAt}>{formatDateTime(version.editedAt)}</time>
            </span>
          </li>
        ))}
      </ol>
      {versions.meta.total === 0 && (
        <p className="mt-6 text-sm text-muted">Esta página ainda não foi editada: não há versões anteriores.</p>
      )}

      <Pager label="Páginas do histórico" page={page} totalPages={pages} href={pageHref} />
    </div>
  );
}
