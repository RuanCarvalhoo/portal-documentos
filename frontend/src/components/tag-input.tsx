'use client';

import { type KeyboardEvent, useState } from 'react';
import { addTags, MAX_TAGS } from '@/lib/tags';
import { CloseIcon } from './icons';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Tags da página como chips: Enter, vírgula ou sair do campo acrescentam; Backspace com o campo
 * vazio remove a última. As tags já saem normalizadas, como a API vai gravá-las.
 */
export function TagInput({ tags, onChange }: TagInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();

  const commit = () => {
    if (!text.trim()) {
      return;
    }
    const result = addTags(tags, text);
    setError(result.error);
    if (!result.error) {
      onChange(result.tags);
      setText('');
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter aqui acrescenta a tag em vez de enviar o formulário
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor="tags" className="block text-sm font-medium">
        Tags <span className="font-normal text-muted">(opcional)</span>
      </label>
      <div className="mt-1.5 flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-accent-fg/25">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-accent-bg py-0.5 pr-1 pl-2 text-xs text-accent-fg">
            #{tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((item) => item !== tag))}
              aria-label={`Remover a tag ${tag}`}
              className="grid size-4 place-items-center rounded-sm hover:bg-accent-fg/15"
            >
              <CloseIcon width={12} height={12} />
            </button>
          </span>
        ))}
        <input
          id="tags"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          disabled={tags.length >= MAX_TAGS}
          placeholder={tags.length >= MAX_TAGS ? 'Limite de tags atingido' : 'ex.: arquitetura, banco-de-dados'}
          aria-invalid={error ? true : undefined}
          aria-describedby="tags-mensagem"
          className="h-7 min-w-40 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <p id="tags-mensagem" className={`mt-1.5 text-sm ${error ? 'text-danger-fg' : 'text-muted'}`}>
        {error ?? `Separe com vírgula ou Enter. Até ${MAX_TAGS} tags, só letras, números e hífens.`}
      </p>
    </div>
  );
}
