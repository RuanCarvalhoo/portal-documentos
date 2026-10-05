import type { Metadata } from 'next';
import { RequireAuth } from '@/components/require-auth';
import { pageParam } from '@/lib/pagination';
import { UsersAdmin } from './users-admin';

export const metadata: Metadata = { title: 'Usuários' };

export default async function UsersPage({ searchParams }: PageProps<'/admin/usuarios'>) {
  const { page } = await searchParams;
  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Usuários</h1>
      <p className="mt-2 mb-8 max-w-2xl text-muted">
        Perfis de acesso: <strong className="font-medium text-foreground">Leitor</strong> lê,{' '}
        <strong className="font-medium text-foreground">Editor</strong> cria e edita espaços e páginas,{' '}
        <strong className="font-medium text-foreground">Admin</strong> também exclui espaços e gerencia perfis.
        A mudança vale na hora para a API.
      </p>
      {/* A lista vem da API com o token do navegador (só Admin): por isso é um Client Component */}
      <RequireAuth role="ADMIN">
        <UsersAdmin page={pageParam(page)} />
      </RequireAuth>
    </div>
  );
}
