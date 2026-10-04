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

  // !pending: logo após entrar, o usuário já existe mas a navegação ainda não terminou
  if (ready && user && !pending) {
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
    if (pending) {
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const found: FieldErrors<'email' | 'password'> = {
      ...(!isEmail(email) && { email: 'Informe um e-mail válido' }),
      ...(!password && { password: 'Informe a senha' }),
    };
    setErrors(found);
    setApiErrors([]);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      // Leva o foco ao campo com problema: o erro dele é lido pelo aria-describedby
      (formElement.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setPending(true);
    try {
      await login(email, password);
      // replace: o Voltar não retorna para a tela de login
      router.replace(next);
    } catch (error) {
      setApiErrors(errorMessages(error));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <ErrorAlert messages={apiErrors} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.email}
      />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" error={errors.password} />
      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <p className="text-xs text-muted">
        Ambiente de demonstração: <code className="font-mono">demo@example.com</code> ·{' '}
        <code className="font-mono">demo1234</code>
      </p>
    </form>
  );
}
