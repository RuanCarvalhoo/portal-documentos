'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ErrorAlert, Field, SubmitButton } from '@/components/ui';
import { errorMessages } from '@/lib/api';
import { type FieldErrors, isEmail } from '@/lib/validation';

type RegisterField = 'name' | 'email' | 'password';

// Mesmos limites da API (RegisterDto)
const MIN_PASSWORD = 8;

export function RegisterForm({ next }: { next: string }) {
  const { register } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const found: FieldErrors<RegisterField> = {
      ...(name.length < 2 && { name: 'Informe seu nome (pelo menos 2 caracteres)' }),
      ...(!isEmail(email) && { email: 'Informe um e-mail válido' }),
      ...(password.length < MIN_PASSWORD && {
        password: `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres`,
      }),
    };
    setErrors(found);
    setApiErrors([]);
    if (Object.keys(found).length > 0) {
      return;
    }

    setPending(true);
    try {
      await register(name, email, password);
      router.push(next);
    } catch (error) {
      setApiErrors(errorMessages(error));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <ErrorAlert messages={apiErrors} />
      <Field label="Nome" name="name" autoComplete="name" error={errors.name} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" error={errors.email} />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        hint={`Mínimo de ${MIN_PASSWORD} caracteres`}
      />
      <SubmitButton pending={pending}>Criar conta</SubmitButton>
    </form>
  );
}
