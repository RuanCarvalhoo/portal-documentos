'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';
import { ApiError, apiFetch, errorMessages } from '@/lib/api';
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
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);
  const formRef = useRef<HTMLFormElement>(null);
  // Versão enviada no PATCH: começa na que a pessoa abriu e só muda se ela escolher salvar por
  // cima da versão de outra pessoa (o mesmo fluxo do editor de páginas)
  const versionRef = useRef(space?.version);

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
    setConflict(false);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      (formElement.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setPending(true);
    try {
      const body = { name, description: description || null };
      const saved = space
        ? await apiFetch<Space>(`/spaces/${space.id}`, {
            method: 'PATCH',
            // version: se outra pessoa salvou antes, a API responde 409 em vez de sobrescrever
            body: { ...body, version: versionRef.current },
            token,
          })
        : await apiFetch<Space>('/spaces', { method: 'POST', body, token });
      // Salvo: a partir daqui sair não descarta nada (a rota nova pode levar alguns segundos)
      setDirty(false);
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
      // O que foi digitado continua nos campos: a pessoa decide sem perder nada
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
        setApiErrors(['Outra pessoa salvou este espaço depois que você abriu o editor. O seu texto continua aqui.']);
      } else {
        setApiErrors(errorMessages(error));
      }
      setPending(false);
    }
  };

  // Escolha explícita depois de um 409: grava estes campos como a versão seguinte à atual
  const saveOverCurrentVersion = async () => {
    if (!space) {
      return;
    }
    try {
      versionRef.current = (await apiFetch<Space>(`/spaces/${space.id}`)).version;
      // O botão clicado some com o alerta: o foco vai para o Salvar em vez de cair no body
      formRef.current?.querySelector<HTMLElement>('button[type="submit"]')?.focus();
      formRef.current?.requestSubmit();
    } catch (error) {
      setApiErrors(errorMessages(error));
    }
  };

  return (
    <form ref={formRef} noValidate onSubmit={submit} onInput={() => setDirty(true)} className="max-w-xl space-y-5">
      <ErrorAlert messages={apiErrors}>
        {/* target=_blank: abre ao lado, sem sair do editor (e sem passar pelo aviso de texto não salvo) */}
        {conflict && space && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/spaces/${space.id}`} target="_blank" rel="noopener" className={secondaryButton}>
              Ver a versão atual (nova aba)
            </a>
            <button type="button" onClick={saveOverCurrentVersion} className={secondaryButton}>
              Salvar por cima da versão atual
            </button>
          </div>
        )}
      </ErrorAlert>
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
