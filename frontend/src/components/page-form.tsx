'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ClipboardEvent, type DragEvent, type FormEvent, memo, useDeferredValue, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ApiError, apiFetch, errorMessages } from '@/lib/api';
import type { TreeOption } from '@/lib/tree';
import { formatDateTime } from '@/lib/format';
import type { Page, PageVersion, UploadedImage } from '@/lib/types';
import { ACCEPT_IMAGES, imageFileError, imageMarkdown, insertBlock } from '@/lib/uploads';
import type { FieldErrors } from '@/lib/validation';
import { useAuth } from './auth-provider';
import { MarkdownContent } from './markdown';
import { TagInput } from './tag-input';
import { ErrorAlert } from './error-alert';
import { ImageIcon } from './icons';
import { Field, secondaryButton, SubmitButton } from './ui';
import { useUnsavedChangesWarning } from './use-unsaved-changes';

type PageField = 'title' | 'content';
// Erros que pedem uma ação além de corrigir um campo
type SaveProblem = 'conflict' | 'session' | null;

// Mesmos limites da API (CreatePageDto)
const MAX_TITLE = 200;
const MAX_CONTENT = 50_000;
// Memoizado: com useDeferredValue, o preview só re-renderiza quando o texto adiado muda e em
// prioridade baixa (sem memo ele refaria o parse do Markdown a cada tecla, em prioridade alta)
const Preview = memo(MarkdownContent);
// Tamanho em code points, como a API conta (length do JS conta unidades UTF-16)
const lengthOf = (text: string) => Array.from(text).length;
// Recuo visual das opções do seletor (espaços não separáveis: <option> não aceita CSS de margem)
const INDENT = String.fromCharCode(160).repeat(3);

interface PageFormProps {
  spaceId: string;
  /** Possíveis páginas pai (na edição, sem a própria página e suas subpáginas) */
  parentOptions: TreeOption[];
  /** Página sendo editada; ausente = criação */
  page?: Page;
  defaultParentId?: string | null;
  /** Versão do histórico cujo texto abre no editor (Restaurar); salvar cria uma versão nova */
  restoring?: PageVersion;
}

export function PageForm({ spaceId, parentOptions, page, defaultParentId, restoring }: PageFormProps) {
  const currentParentId = page?.parentId ?? null;
  // Se a navegação não carregou (ou está desatualizada), o pai atual pode não estar na lista:
  // sem esta opção o seletor cairia em "raiz" e salvar moveria a página sem a pessoa pedir
  const options =
    currentParentId && !parentOptions.some((option) => option.id === currentParentId)
      ? [{ id: currentParentId, title: 'Página pai atual', depth: 0 }, ...parentOptions]
      : parentOptions;
  const { token } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState(restoring?.content ?? page?.content ?? '');
  // Tags não entram no histórico: restaurar uma versão mantém as tags atuais
  const [tags, setTags] = useState(page?.tags ?? []);
  // Preview com prioridade menor que a digitação: textos longos não travam o teclado
  const previewContent = useDeferredValue(content);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [errors, setErrors] = useState<FieldErrors<PageField>>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [problem, setProblem] = useState<SaveProblem>(null);
  // Login refeito em outra aba (token novo): o aviso de sessão expirada já não vale
  const [tokenSeen, setTokenSeen] = useState(token);
  if (token !== tokenSeen) {
    setTokenSeen(token);
    if (problem === 'session') {
      setProblem(null);
      setApiErrors([]);
    }
  }
  const [pending, setPending] = useState(false);
  // Restaurando: o texto no editor já difere do salvo, então sair sem salvar também avisa
  const [dirty, setDirty] = useState(restoring !== undefined);
  useUnsavedChangesWarning(dirty);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Versão enviada no PATCH: começa na que a pessoa abriu e só muda se ela escolher salvar por
  // cima da versão de outra pessoa
  const versionRef = useRef(page?.version);

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
      ...(lengthOf(title) > MAX_TITLE && { title: `O título deve ter no máximo ${MAX_TITLE} caracteres` }),
      ...(lengthOf(content) > MAX_CONTENT && {
        content: `O conteúdo deve ter no máximo ${MAX_CONTENT.toLocaleString('pt-BR')} caracteres`,
      }),
    };
    setErrors(found);
    setApiErrors([]);
    setProblem(null);
    const firstInvalid = (['title', 'content'] as const).find((field) => found[field]);
    if (firstInvalid) {
      // flushSync: o textarea precisa estar visível (aba Escrever no mobile) antes do foco
      flushSync(() => setTab('write'));
      const field = formElement.elements.namedItem(firstInvalid);
      if (field instanceof HTMLElement) {
        field.focus();
      }
      return;
    }

    setPending(true);
    try {
      const saved = page
        ? await apiFetch<Page>(`/pages/${page.id}`, {
            method: 'PATCH',
            // version: se outra pessoa salvou antes, a API responde 409 em vez de sobrescrever
            // parentId só vai se mudou: editar o texto nunca move a página por acidente
            body: {
              title,
              content,
              tags,
              version: versionRef.current,
              ...(parentId !== currentParentId && { parentId }),
            },
            token,
          })
        : await apiFetch<Page>(`/spaces/${spaceId}/pages`, {
            method: 'POST',
            body: { title, content, parentId, tags },
            token,
          });
      // Salvo: a partir daqui sair não descarta nada (a rota nova pode levar alguns segundos)
      setDirty(false);
      const destination = `/pages/${saved.id}`;
      if (page) {
        router.replace(destination);
      } else {
        router.push(destination);
      }
      // A sidebar vem do layout, que não é refeito na navegação do cliente
      router.refresh();
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      // O texto nunca se perde aqui: os dois casos se resolvem sem sair do editor
      if (status === 409) {
        setProblem('conflict');
        setApiErrors(['Outra pessoa salvou esta página depois que você abriu o editor. O seu texto continua aqui.']);
      } else if (status === 401) {
        setProblem('session');
        setApiErrors([
          'Sua sessão expirou. Entre de novo em outra aba e depois salve aqui: o seu texto continua no editor.',
        ]);
      } else {
        setApiErrors(errorMessages(error));
      }
      setPending(false);
    }
  };

  // Envia a imagem e insere o Markdown dela onde está o cursor (ou no lugar da seleção)
  const uploadImage = async (file: File) => {
    const invalid = imageFileError(file);
    if (invalid) {
      setApiErrors([invalid]);
      return;
    }
    setApiErrors([]);
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const image = await apiFetch<UploadedImage>('/uploads', { method: 'POST', body: form, token });
      // O cursor de agora, não o de antes do envio: a pessoa pode ter continuado a escrever
      const textarea = textareaRef.current;
      const text = textarea?.value ?? content;
      const start = textarea?.selectionStart ?? text.length;
      const end = textarea?.selectionEnd ?? start;
      const inserted = insertBlock(text, start, end, imageMarkdown(image.fileName, image.path));
      setContent(inserted.text);
      // Mudança feita pelo código não dispara o onInput do formulário
      setDirty(true);
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(inserted.cursor, inserted.cursor);
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setProblem('session');
        setApiErrors(['Sua sessão expirou. Entre de novo em outra aba e envie a imagem outra vez.']);
      } else {
        setApiErrors(errorMessages(error));
      }
    } finally {
      setUploading(false);
    }
  };

  const imageFrom = (files: FileList) => Array.from(files).find((file) => file.type.startsWith('image/'));
  const pasteImage = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const file = imageFrom(event.clipboardData.files);
    if (file) {
      event.preventDefault();
      void uploadImage(file);
    }
  };
  const dropImage = (event: DragEvent<HTMLTextAreaElement>) => {
    const file = imageFrom(event.dataTransfer.files);
    if (file) {
      event.preventDefault();
      void uploadImage(file);
    }
  };

  // Escolha explícita depois de um 409: grava este texto como a versão seguinte à atual
  const saveOverCurrentVersion = async () => {
    if (!page) {
      return;
    }
    try {
      versionRef.current = (await apiFetch<Page>(`/pages/${page.id}`)).version;
      // O botão clicado some com o alerta: o foco vai para o Salvar em vez de cair no body
      formRef.current?.querySelector<HTMLElement>('button[type="submit"]')?.focus();
      formRef.current?.requestSubmit();
    } catch (error) {
      setApiErrors(errorMessages(error));
    }
  };

  const cancelHref = page ? `/pages/${page.id}` : `/spaces/${spaceId}`;

  return (
    <form ref={formRef} noValidate onSubmit={submit} onInput={() => setDirty(true)} className="space-y-5">
      <ErrorAlert messages={apiErrors}>
        {/* target=_blank: abre ao lado, sem sair do editor (e sem passar pelo aviso de texto não salvo) */}
        {problem === 'conflict' && page && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/pages/${page.id}`} target="_blank" rel="noopener" className={secondaryButton}>
              Ver a versão atual (nova aba)
            </a>
            <button type="button" onClick={saveOverCurrentVersion} className={secondaryButton}>
              Salvar por cima da versão atual
            </button>
          </div>
        )}
        {problem === 'session' && (
          <div className="mt-3">
            <a href="/login" target="_blank" rel="noopener" className={secondaryButton}>
              Entrar em nova aba
            </a>
          </div>
        )}
      </ErrorAlert>
      {restoring && (
        <p role="note" className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
          Restaurando o texto da versão {restoring.version}, escrita por {restoring.editedBy.name} em{' '}
          {formatDateTime(restoring.editedAt)}. Revise e salve: a versão atual vai para o histórico.
        </p>
      )}
      <Field label="Título" name="title" defaultValue={restoring?.title ?? page?.title} maxLength={MAX_TITLE} error={errors.title} />

      <TagInput
        tags={tags}
        onChange={(next) => {
          // Remover um chip não dispara o onInput do formulário
          setTags(next);
          setDirty(true);
        }}
      />

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
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {INDENT.repeat(option.depth)}
              {option.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="content" className="block text-sm font-medium">
              Conteúdo <span className="font-normal text-muted">(Markdown)</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-disabled={uploading}
              disabled={uploading}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-foreground disabled:opacity-60"
            >
              <ImageIcon width={14} height={14} /> {uploading ? 'Enviando imagem...' : 'Inserir imagem'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_IMAGES}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              // Escolher um arquivo não é editar o texto: não marca o formulário como alterado
              onInput={(event) => event.stopPropagation()}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Limpa para que escolher o mesmo arquivo de novo também dispare o envio
                event.target.value = '';
                if (file) {
                  void uploadImage(file);
                }
              }}
            />
          </div>
          {/* Abas só no mobile; em telas largas editor e preview ficam lado a lado */}
          <div aria-label="Modo do editor" role="group" className="flex gap-1 text-sm lg:hidden">
            {(['write', 'preview'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={tab === mode}
                onClick={() => setTab(mode)}
                className="rounded-md px-2.5 py-1 text-muted aria-pressed:bg-hover aria-pressed:text-foreground"
              >
                {mode === 'write' ? 'Escrever' : 'Visualizar'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-1.5 grid gap-4 lg:grid-cols-2">
          <div className={tab === 'write' ? '' : 'max-lg:hidden'}>
            <textarea
              ref={textareaRef}
              id="content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onPaste={pasteImage}
              onDrop={dropImage}
              aria-invalid={errors.content ? true : undefined}
              aria-describedby="content-mensagem"
              spellCheck
              className="block h-[28rem] w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-sm leading-relaxed outline-none focus:border-foreground/40 focus:ring-2 focus:ring-accent-fg/25 aria-[invalid=true]:border-danger-fg/60"
            />
            <p id="content-mensagem" className={`mt-1.5 text-sm ${errors.content ? 'text-danger-fg' : 'text-muted'}`}>
              {errors.content ??
                'Títulos com #, listas, tabelas, links e blocos de código com ```linguagem. Cole ou arraste imagens para enviá-las (PNG, JPEG, GIF ou WebP, até 5 MB).'}
            </p>
          </div>
          <section
            aria-label="Pré-visualização"
            className={`h-[28rem] overflow-y-auto rounded-md border border-border bg-surface px-5 py-4 ${tab === 'preview' ? '' : 'max-lg:hidden'}`}
          >
            {previewContent.trim() ? (
              <Preview content={previewContent} anchors={false} />
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
