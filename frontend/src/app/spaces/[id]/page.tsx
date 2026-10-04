import type { Metadata } from 'next';
import Link from 'next/link';
import { DeleteButton } from '@/components/delete-button';
import { PlusIcon } from '@/components/icons';
import { AuthOnly } from '@/components/require-auth';
import { primaryButton, secondaryButton } from '@/components/ui';
import { getNavigation } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { TreeNode } from '@/lib/types';
import { getSpace } from '../space';

export async function generateMetadata({ params }: PageProps<'/spaces/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getSpace(id)).name };
}

export default async function SpacePage({ params }: PageProps<'/spaces/[id]'>) {
  const { id } = await params;
  const [space, navigation] = await Promise.all([getSpace(id), getNavigation()]);
  const pages = navigation?.find((item) => item.id === id)?.pages ?? [];

  return (
    <article>
      <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Espaço</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{space.name}</h1>
        <AuthOnly>
          <div className="flex flex-wrap gap-2">
            <Link href={`/spaces/${id}/pages/new`} className={primaryButton}>
              <PlusIcon /> Nova página
            </Link>
            <Link href={`/spaces/${id}/edit`} className={secondaryButton}>
              Editar
            </Link>
            <DeleteButton
              endpoint={`/spaces/${id}`}
              confirmMessage={`Excluir o espaço "${space.name}" e todas as suas páginas? Esta ação não pode ser desfeita.`}
              redirectTo="/"
            />
          </div>
        </AuthOnly>
      </div>
      {space.description && <p className="mt-4 max-w-2xl text-lg text-muted">{space.description}</p>}
      <p className="mt-3 text-xs text-muted">Atualizado em {formatDateTime(space.updatedAt)}</p>

      <h2 className="mt-12 border-b border-border pb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        Páginas
      </h2>
      {pages.length === 0 ? (
        <p className="mt-4 text-muted">Este espaço ainda não tem páginas.</p>
      ) : (
        <PageList nodes={pages} />
      )}
    </article>
  );
}

function PageList({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {nodes.map((node) => (
        <li key={node.id}>
          <Link href={`/pages/${node.id}`} className="underline-offset-4 hover:underline">
            {node.title}
          </Link>
          {node.children.length > 0 && (
            <div className="mt-1.5 ml-1 border-l border-border pl-4">
              <PageList nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
