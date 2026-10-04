import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/ui';
import { safeRedirect } from '@/lib/navigation';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Criar conta' };

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
  const { next } = await searchParams;
  const destination = safeRedirect(typeof next === 'string' ? next : null);

  return (
    <AuthCard title="Criar conta" subtitle="Com uma conta você cria e edita espaços e páginas.">
      <RegisterForm next={destination} />
      <p className="mt-8 text-sm text-muted">
        Já tem conta?{' '}
        <Link href={`/login?next=${encodeURIComponent(destination)}`} className="text-foreground underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
