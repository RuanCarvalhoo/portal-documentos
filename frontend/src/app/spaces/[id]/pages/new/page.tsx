import type { Metadata } from 'next';
import { PageForm } from '@/components/page-form';
import { RequireAuth } from '@/components/require-auth';
import { getNavigation } from '@/lib/server-api';
import { flattenTree } from '@/lib/tree';
import { getSpace } from '../../../space';

export const metadata: Metadata = { title: 'Nova página' };

export default async function NewPagePage({ params, searchParams }: PageProps<'/spaces/[id]/pages/new'>) {
  const { id } = await params;
  const { parentId } = await searchParams;
  const [space, navigation] = await Promise.all([getSpace(id), getNavigation()]);
  const parentOptions = flattenTree(navigation?.find((item) => item.id === space.id)?.pages ?? []);
  // Só pré-seleciona um pai que realmente pertence a este espaço
  const defaultParentId = parentOptions.find((option) => option.id === parentId)?.id ?? null;

  return (
    <div>
      <p className="text-sm text-muted">{space.name}</p>
      <h1 className="mt-1 mb-8 font-serif text-4xl tracking-tight">Nova página</h1>
      <RequireAuth>
        <PageForm spaceId={space.id} parentOptions={parentOptions} defaultParentId={defaultParentId} />
      </RequireAuth>
    </div>
  );
}
