'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, errorMessages } from '@/lib/api';
import { useAuth } from './auth-provider';

interface DeleteButtonProps {
  /** Rota da API, ex.: /spaces/:id */
  endpoint: string;
  confirmMessage: string;
  /** Para onde ir depois de excluir */
  redirectTo: string;
  label?: string;
}

export function DeleteButton({ endpoint, confirmMessage, redirectTo, label = 'Excluir' }: DeleteButtonProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (pending || !window.confirm(confirmMessage)) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiFetch(endpoint, { method: 'DELETE', token });
      router.push(redirectTo);
      // Atualiza a sidebar (layout), que não é refeita na navegação do cliente
      router.refresh();
    } catch (failure) {
      setError(errorMessages(failure).join(' '));
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        aria-disabled={pending}
        className="inline-flex h-9 items-center rounded-md border border-border px-3.5 text-sm text-danger-fg transition-colors hover:bg-danger-bg aria-disabled:opacity-60"
      >
        {pending ? 'Excluindo...' : label}
      </button>
      <span role="alert" className="max-w-56 text-right text-xs text-danger-fg">
        {error}
      </span>
    </span>
  );
}
