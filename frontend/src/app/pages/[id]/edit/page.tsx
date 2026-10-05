import type { Metadata } from 'next';
import { PageForm } from '@/components/page-form';
import { RequireAuth } from '@/components/require-auth';
import { getNavigation } from '@/lib/server-api';
import { flattenTree } from '@/lib/tree';
import { getPage, getPageVersion } from '../../get-page';

export async function generateMetadata({ params }: PageProps<'/pages/[id]/edit'>): Promise<Metadata> {
  const { id } = await params;
  return { title: `Editar ${(await getPage(id)).title}` };
}

export default async function EditPagePage({ params, searchParams }: PageProps<'/pages/[id]/edit'>) {
  const { id } = await params;
  const { fromVersion } = await searchParams;
  // Restaurar (histórico): o editor abre com o texto daquela versão
  const [page, navigation, restoring] = await Promise.all([
    getPage(id),
    getNavigation(),
    typeof fromVersion === 'string' ? getPageVersion(id, fromVersion) : undefined,
  ]);
  // Sem a própria página e as subpáginas: a API também recusaria (ciclo)
  const parentOptions = flattenTree(navigation?.find((item) => item.id === page.spaceId)?.pages ?? [], page.id);

  return (
    <div>
      <h1 className="mb-8 font-serif text-4xl tracking-tight">Editar página</h1>
      <RequireAuth>
        <PageForm spaceId={page.spaceId} parentOptions={parentOptions} page={page} restoring={restoring} />
      </RequireAuth>
    </div>
  );
}
