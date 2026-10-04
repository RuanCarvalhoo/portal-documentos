'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useDeferredValue, useState } from 'react';
import { ApiError, apiFetch, errorMessages } from '@/lib/api';
import type { TreeOption } from '@/lib/tree';
import type { Page } from '@/lib/types';
import type { FieldErrors } from '@/lib/validation';
import { useAuth } from './auth-provider';
import { MarkdownContent } from './markdown';
import { ErrorAlert, Field, secondaryButton, SubmitButton } from './ui';

type PageField = 'title' | 'content';

// Mesmos limites da API (CreatePageDto)
const MAX_TITLE = 200;
const MAX_CONTENT = 50_000;
// Recuo visual das opções do seletor (espaços não separáveis: <option> não aceita CSS de margem)
const INDENT = String.fromCharCode(160).repeat(3);

interface PageFormProps {
  spaceId: string;
  /** Possíveis páginas pai (na edição, sem a própria página e suas subpáginas) */
  parentOptions: TreeOption[];
  /** Página sendo editada; ausente = criação */
  page?: Page;
  defaultParentId?: string | null;
}

export function PageForm({ spaceId, parentOptions, page, defaultParentId }: PageFormProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState(page?.content ?? '');
  // Preview com prioridade menor que a digitação: textos longos não travam o teclado
  const previewContent = useDeferredValue(content);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [errors, setErrors] = useState<FieldErrors<PageField>>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) {
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') ?? '').trim();
    const parentId = String(form.get('parentId') ?? '') || null;

    const found: FieldErrors<PageField> = {
      ...(!title && { title: 'Informe o título da página' }),
      ...(title.length > MAX_TITLE && { title: `O título deve ter no máximo ${MAX_TITLE} caracteres` }),
      ...(content.length > MAX_CONTENT && {
        content: `O conteúdo deve ter no máximo ${MAX_CONTENT.toLocaleString('pt-BR')} caracteres`,
      }),
    };
    setErrors(found);
    setApiErrors([]);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      setTab('write');
      (formElement.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setPending(true);
    try {
      const saved = page
        ? await apiFetch<Page>(`/pages/${page.id}`, {
            method: 'PATCH',
            // version: se outra pessoa salvou antes, a API responde 409 em vez de sobrescrever
            body: { title, content, parentId, version: page.version },
            token,
          })
        : await apiFetch<Page>(`/spaces/${spaceId}/pages`, {
            method: 'POST',
            body: { title, content, parentId },
            token,
          });
      const destination = `/pages/${saved.id}`;
      if (page) {
        router.replace(destination);
      } else {
        router.push(destination);
      }
      // A sidebar vem do layout, que não é refeito na navegação do cliente
      router.refresh();
    } catch (error) {
      const messages = errorMessages(error);
      setApiErrors(
        error instanceof ApiError && error.status === 409
          ? [...messages, 'O seu texto continua no editor: copie-o antes de recarregar a página.']
          : messages,
      );
      setPending(false);
    }
  };

  const cancelHref = page ? `/pages/${page.id}` : `/spaces/${spaceId}`;

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <ErrorAlert messages={apiErrors} />
      <Field label="Título" name="title" defaultValue={page?.title} maxLength={MAX_TITLE} error={errors.title} />

      <div>
        <label htmlFor="parentId" className="block text-sm font-medium">
          Página pai
        </label>
        <select
          id="parentId"
          name="parentId"
          defaultValue={page?.parentId ?? defaultParentId ?? ''}
          className="mt-1.5 block h-10 w-full max-w-md rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-foreground/40 focus:ring-2 focus:ring-accent-fg/25"
        >
          <option value="">Nenhuma (raiz do espaço)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {INDENT.repeat(option.depth)}
              {option.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-end justify-between gap-4">
          <label htmlFor="content" className="block text-sm font-medium">
            Conteúdo <span className="font-normal text-muted">(Markdown)</span>
          </label>
          {/* Abas só no mobile; em telas largas editor e preview ficam lado a lado */}
          <div role="tablist" aria-label="Modo do editor" className="flex gap-1 text-sm lg:hidden">
            {(['write', 'preview'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={tab === mode}
                onClick={() => setTab(mode)}
                className="rounded-md px-2.5 py-1 text-muted aria-selected:bg-hover aria-selected:text-foreground"
              >
                {mode === 'write' ? 'Escrever' : 'Visualizar'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-1.5 grid gap-4 lg:grid-cols-2">
          <div className={tab === 'write' ? '' : 'max-lg:hidden'}>
            <textarea
              id="content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              aria-invalid={errors.content ? true : undefined}
              aria-describedby="content-mensagem"
              spellCheck
              className="block h-[28rem] w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-sm leading-relaxed outline-none focus:border-foreground/40 focus:ring-2 focus:ring-accent-fg/25 aria-[invalid=true]:border-danger-fg/60"
            />
            <p id="content-mensagem" className={`mt-1.5 text-sm ${errors.content ? 'text-danger-fg' : 'text-muted'}`}>
              {errors.content ?? 'Títulos com #, listas, tabelas, links, imagens e blocos de código com ```linguagem.'}
            </p>
          </div>
          <section
            aria-label="Pré-visualização"
            className={`h-[28rem] overflow-y-auto rounded-md border border-border bg-surface px-5 py-4 ${tab === 'preview' ? '' : 'max-lg:hidden'}`}
          >
            {previewContent.trim() ? (
              <MarkdownContent content={previewContent} />
            ) : (
              <p className="text-sm text-muted">A pré-visualização aparece aqui.</p>
            )}
          </section>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{page ? 'Salvar alterações' : 'Criar página'}</SubmitButton>
        <Link href={cancelHref} className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
