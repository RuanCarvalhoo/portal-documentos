import type { Metadata } from 'next';
import Link from 'next/link';
import { DeleteButton } from '@/components/delete-button';
import { PlusIcon } from '@/components/icons';
import { AuthOnly } from '@/components/require-auth';
import { primaryButton, secondaryButton } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { getNavigation } from '@/lib/server-api';
import type { TreeNode } from '@/lib/types';
import { getSpace } from '../space';

export async function generateMetadata({ params }: PageProps<'/spaces/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getSpace(id)).name };
}

export default async function SpacePage({ params }: PageProps<'/spaces/[id]'>) {
  const { id } = await params;
  const [space, navigation] = await Promise.all([getSpace(id), getNavigation()]);
  // Links e endpoints usam o id devolvido pela API, nunca o parâmetro bruto da URL
  const pages = navigation?.find((item) => item.id === space.id)?.pages;

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{space.name}</h1>
        {/* Altura reservada: as ações só aparecem depois de confirmar a sessão (sem "pulo") */}
        <div className="min-h-9">
          <AuthOnly role="EDITOR">
            <div className="flex flex-wrap items-start gap-2">
              <Link href={`/spaces/${space.id}/pages/new`} className={primaryButton}>
                <PlusIcon /> Nova página
              </Link>
              <Link href={`/spaces/${space.id}/edit`} className={secondaryButton}>
                Editar
              </Link>
              {/* Excluir leva a árvore inteira de páginas: só Admin */}
              <AuthOnly role="ADMIN">
                <DeleteButton
                  endpoint={`/spaces/${space.id}`}
                  confirmMessage={`Excluir o espaço "${space.name}" e todas as suas páginas? Esta ação não pode ser desfeita.`}
                  redirectTo="/"
                />
              </AuthOnly>
            </div>
          </AuthOnly>
        </div>
      </div>
      {space.description && <p className="mt-4 max-w-2xl text-lg text-muted">{space.description}</p>}
      <p className="mt-3 text-xs text-muted">
        Atualizado em <time dateTime={space.updatedAt}>{formatDateTime(space.updatedAt)}</time>
      </p>

      <h2 className="mt-12 border-b border-border pb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        Páginas
      </h2>
      {pages === undefined ? (
        <p className="mt-4 text-muted">Não foi possível carregar as páginas agora. Tente recarregar.</p>
      ) : pages.length === 0 ? (
        <p className="mt-4 text-muted">Este espaço ainda não tem páginas.</p>
      ) : (
        <PageList nodes={pages} className="mt-3" />
      )}
    </article>
  );
}

function PageList({ nodes, className = '' }: { nodes: TreeNode[]; className?: string }) {
  return (
    // role="list": sem marcadores (Tailwind), alguns leitores de tela deixam de tratar como lista
    <ul role="list" className={`space-y-1.5 ${className}`}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link href={`/pages/${node.id}`} className="underline-offset-4 hover:underline">
            {node.title}
          </Link>
          {node.children.length > 0 && (
            <PageList nodes={node.children} className="mt-1.5 ml-1 border-l border-border pl-4" />
          )}
        </li>
      ))}
    </ul>
  );
}
