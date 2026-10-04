import type { Metadata } from 'next';
import { RequireAuth } from '@/components/require-auth';
import { SpaceForm } from '@/components/space-form';
import { getSpace } from '../../space';

export async function generateMetadata({ params }: PageProps<'/spaces/[id]/edit'>): Promise<Metadata> {
  const { id } = await params;
  return { title: `Editar ${(await getSpace(id)).name}` };
}

export default async function EditSpacePage({ params }: PageProps<'/spaces/[id]/edit'>) {
  const { id } = await params;
  const space = await getSpace(id);

  return (
    <div>
      <h1 className="mb-8 font-serif text-4xl tracking-tight">Editar espaço</h1>
      <RequireAuth>
        <SpaceForm space={space} />
      </RequireAuth>
    </div>
  );
}
