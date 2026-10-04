import type { Metadata } from 'next';
import Link from 'next/link';
import { DeleteButton } from '@/components/delete-button';
import { PlusIcon } from '@/components/icons';
import { MarkdownContent } from '@/components/markdown';
import { AuthOnly } from '@/components/require-auth';
import { TableOfContents } from '@/components/table-of-contents';
import { primaryButton, secondaryButton } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { getNavigation } from '@/lib/server-api';
import { extractToc } from '@/lib/toc';
import { findAncestorIds, flattenTree } from '@/lib/tree';
import { getPage } from '../get-page';

// O sumário só ajuda a partir de alguns títulos
const MIN_TOC_ITEMS = 2;

export async function generateMetadata({ params }: PageProps<'/pages/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getPage(id)).title };
}

export default async function PageView({ params }: PageProps<'/pages/[id]'>) {
  const { id } = await params;
  const [page, navigation] = await Promise.all([getPage(id), getNavigation()]);

  const space = navigation?.find((item) => item.id === page.spaceId);
  const titles = new Map(flattenTree(space?.pages ?? []).map((option) => [option.id, option.title]));
  const ancestors = (space ? (findAncestorIds(space.pages, page.id) ?? []) : []).map((ancestorId) => ({
    id: ancestorId,
    title: titles.get(ancestorId) ?? '',
  }));
  const toc = extractToc(page.content);
  const showToc = toc.length >= MIN_TOC_ITEMS;

  return (
    <div className={showToc ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-10' : ''}>
      <article className="min-w-0">
        <nav aria-label="Caminho da página">
          <ol role="list" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href={`/spaces/${page.spaceId}`} className="inline-block py-1 hover:text-foreground">
                {space?.name ?? 'Espaço'}
              </Link>
            </li>
            {ancestors.map((ancestor) => (
              <li key={ancestor.id} className="flex items-center gap-1.5">
                <span aria-hidden="true">/</span>
                <Link href={`/pages/${ancestor.id}`} className="inline-block py-1 hover:text-foreground">
                  {ancestor.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{page.title}</h1>
          {/* Altura reservada: as ações só aparecem depois de confirmar a sessão (sem "pulo") */}
          <div className="min-h-9">
            <AuthOnly>
              <div className="flex flex-wrap items-start gap-2">
                <Link href={`/pages/${page.id}/edit`} className={primaryButton}>
                  Editar
                </Link>
                <Link href={`/spaces/${page.spaceId}/pages/new?parentId=${page.id}`} className={secondaryButton}>
                  <PlusIcon /> Subpágina
                </Link>
                <DeleteButton
                  endpoint={`/pages/${page.id}`}
                  confirmMessage={`Excluir a página "${page.title}" e todas as subpáginas? Esta ação não pode ser desfeita.`}
                  redirectTo={`/spaces/${page.spaceId}`}
                />
              </div>
            </AuthOnly>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          Criada por {page.createdBy.name} em{' '}
          <time dateTime={page.createdAt}>{formatDateTime(page.createdAt)}</time> · Editada por{' '}
          {page.updatedBy.name} em <time dateTime={page.updatedAt}>{formatDateTime(page.updatedAt)}</time>
        </p>

        {showToc && (
          <details className="mt-6 rounded-md border border-border px-4 py-3 xl:hidden">
            <summary className="cursor-pointer text-sm font-medium">Nesta página</summary>
            <div className="mt-3">
              <TableOfContents items={toc} />
            </div>
          </details>
        )}

        <div className="mt-8 border-t border-border pt-8">
          {page.content.trim() ? (
            <MarkdownContent content={page.content} />
          ) : (
            <p className="text-muted">Esta página ainda não tem conteúdo.</p>
          )}
        </div>
      </article>

      {showToc && (
        <nav aria-label="Nesta página" className="hidden xl:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Nesta página</p>
            <TableOfContents items={toc} />
          </div>
        </nav>
      )}
    </div>
  );
}
