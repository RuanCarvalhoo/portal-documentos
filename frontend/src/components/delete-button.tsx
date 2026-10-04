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

  const remove = async () => {
    if (pending || !window.confirm(confirmMessage)) {
      return;
    }
    setPending(true);
    try {
      await apiFetch(endpoint, { method: 'DELETE', token });
      router.push(redirectTo);
      // Atualiza a sidebar (layout), que não é refeita na navegação do cliente
      router.refresh();
    } catch (error) {
      window.alert(errorMessages(error).join('\n'));
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={remove}
      aria-disabled={pending}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-danger-fg transition-colors hover:bg-danger-bg aria-disabled:opacity-60"
    >
      {pending ? 'Excluindo...' : label}
    </button>
  );
}
