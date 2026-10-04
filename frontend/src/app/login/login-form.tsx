'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ErrorAlert, Field, SubmitButton } from '@/components/ui';
import { errorMessages } from '@/lib/api';
import { type FieldErrors, isEmail } from '@/lib/validation';

export function LoginForm({ next }: { next: string }) {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  if (ready && user) {
    return (
      <p className="text-sm">
        Você já entrou como <strong>{user.name}</strong>.{' '}
        <Link href={next} className="underline underline-offset-4">
          Continuar
        </Link>
      </p>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const found: FieldErrors<'email' | 'password'> = {
      ...(!isEmail(email) && { email: 'Informe um e-mail válido' }),
      ...(!password && { password: 'Informe a senha' }),
    };
    setErrors(found);
    setApiErrors([]);
    if (Object.keys(found).length > 0) {
      return;
    }

    setPending(true);
    try {
      await login(email, password);
      router.push(next);
    } catch (error) {
      setApiErrors(errorMessages(error));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <ErrorAlert messages={apiErrors} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" error={errors.email} />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" error={errors.password} />
      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <p className="text-xs text-muted">
        Ambiente de demonstração: <code className="font-mono">demo@example.com</code> ·{' '}
        <code className="font-mono">demo1234</code>
      </p>
    </form>
  );
}
