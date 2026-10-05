'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { apiFetch, errorMessages } from '@/lib/api';
import type { Space } from '@/lib/types';
import type { FieldErrors } from '@/lib/validation';
import { useAuth } from './auth-provider';
import { ErrorAlert } from './error-alert';
import { Field, secondaryButton, SubmitButton, TextAreaField } from './ui';
import { useUnsavedChangesWarning } from './use-unsaved-changes';

type SpaceField = 'name' | 'description';

// Mesmos limites da API (CreateSpaceDto)
const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

/** Criação (sem `space`) ou edição de um espaço. */
export function SpaceForm({ space }: { space?: Space }) {
  const { token } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<SpaceField>>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) {
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();

    const found: FieldErrors<SpaceField> = {
      ...(!name && { name: 'Informe o nome do espaço' }),
      ...(name.length > MAX_NAME && { name: `O nome deve ter no máximo ${MAX_NAME} caracteres` }),
      ...(description.length > MAX_DESCRIPTION && {
        description: `A descrição deve ter no máximo ${MAX_DESCRIPTION} caracteres`,
      }),
    };
    setErrors(found);
    setApiErrors([]);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      (formElement.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setPending(true);
    try {
      const body = { name, description: description || null };
      const saved = space
        ? await apiFetch<Space>(`/spaces/${space.id}`, { method: 'PATCH', body, token })
        : await apiFetch<Space>('/spaces', { method: 'POST', body, token });
      // Edição: replace, para o Voltar não reabrir o formulário já salvo
      const destination = `/spaces/${saved.id}`;
      if (space) {
        router.replace(destination);
      } else {
        router.push(destination);
      }
      // A sidebar vem do layout, que não é refeito na navegação do cliente
      router.refresh();
    } catch (error) {
      setApiErrors(errorMessages(error));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} onInput={() => setDirty(true)} className="max-w-xl space-y-5">
      <ErrorAlert messages={apiErrors} />
      <Field label="Nome" name="name" defaultValue={space?.name} maxLength={MAX_NAME} error={errors.name} />
      <TextAreaField
        label="Descrição"
        name="description"
        rows={3}
        defaultValue={space?.description ?? ''}
        maxLength={MAX_DESCRIPTION}
        error={errors.description}
        hint={`Opcional. Até ${MAX_DESCRIPTION} caracteres.`}
      />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{space ? 'Salvar alterações' : 'Criar espaço'}</SubmitButton>
        <Link href={space ? `/spaces/${space.id}` : '/'} className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
