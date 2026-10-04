import type { Metadata } from 'next';
import { RequireAuth } from '@/components/require-auth';
import { SpaceForm } from '@/components/space-form';

export const metadata: Metadata = { title: 'Novo espaço' };

export default function NewSpacePage() {
  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Novo espaço</h1>
      <p className="mt-2 mb-8 text-muted">Um espaço agrupa páginas sobre um mesmo assunto.</p>
      <RequireAuth>
        <SpaceForm />
      </RequireAuth>
    </div>
  );
}
