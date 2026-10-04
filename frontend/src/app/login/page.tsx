import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/ui';
import { safeRedirect } from '@/lib/navigation';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  const destination = safeRedirect(typeof next === 'string' ? next : null);

  return (
    <AuthCard title="Entrar" subtitle="Acesse para criar e editar a documentação.">
      <LoginForm next={destination} />
      <p className="mt-8 text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link href={`/register?next=${encodeURIComponent(destination)}`} className="text-foreground underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </AuthCard>
  );
}
