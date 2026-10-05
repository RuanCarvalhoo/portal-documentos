import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Pager } from '@/components/pager';
import { TagList } from '@/components/tag-list';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { pageParam, totalPages as countPages } from '@/lib/pagination';
import { serverFetch } from '@/lib/server-api';
import { isValidTag, normalizeTag, tagHref } from '@/lib/tags';
import type { Paginated, TaggedPage } from '@/lib/types';

const PAGE_SIZE = 20;

function decodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    // Escape malformado: segue com o texto cru, que não passa na validação
    return param;
  }
}

/** Tag da URL na forma canônica; o que não for uma tag válida vira 404 sem chamar a API. */
function tagOf(param: string): string {
  const tag = normalizeTag(decodeParam(param));
  if (!isValidTag(tag)) {
    notFound();
  }
  return tag;
}

export async function generateMetadata({ params }: PageProps<'/tags/[name]'>): Promise<Metadata> {
  return { title: `#${tagOf((await params).name)}` };
}

export default async function TagPage({ params, searchParams }: PageProps<'/tags/[name]'>) {
  const { name } = await params;
  const tag = tagOf(name);
  const page = pageParam((await searchParams).page);
  // /tags/Banco%20de%20Dados leva para /tags/banco-de-dados (um endereço por tag)
  if (decodeParam(name) !== tag) {
    redirect(tagHref(tag));
  }

  let pages: Paginated<TaggedPage>;
  try {
    pages = await serverFetch<Paginated<TaggedPage>>(
      `/tags/${encodeURIComponent(tag)}/pages?page=${page}&limit=${PAGE_SIZE}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  const totalPages = countPages(pages.meta.total, PAGE_SIZE);
  if (pages.data.length === 0 && pages.meta.total > 0) {
    redirect(`${tagHref(tag)}?page=${totalPages}`);
  }

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/tags" className="underline underline-offset-4 hover:text-foreground">
          Tags
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">#{tag}</h1>
      <p className="mt-2 text-sm text-muted">
        {pages.meta.total} {pages.meta.total === 1 ? 'página' : 'páginas'}, das editadas mais recentemente
      </p>

      <ol role="list" className="mt-6 divide-y divide-border border-y border-border">
        {pages.data.map((item) => (
          <li key={item.id} className="py-5">
            <p className="text-xs text-muted">{item.spaceName}</p>
            <Link href={`/pages/${item.id}`} className="mt-0.5 block font-serif text-xl tracking-tight hover:underline">
              {item.title}
            </Link>
            <TagList tags={item.tags} className="mt-2" />
            <p className="mt-1.5 text-xs text-muted">
              Atualizada em <time dateTime={item.updatedAt}>{formatDateTime(item.updatedAt)}</time>
            </p>
          </li>
        ))}
      </ol>

      <Pager
        label="Páginas com a tag"
        page={page}
        totalPages={totalPages}
        href={(target) => `${tagHref(tag)}?page=${target}`}
      />
    </div>
  );
}
