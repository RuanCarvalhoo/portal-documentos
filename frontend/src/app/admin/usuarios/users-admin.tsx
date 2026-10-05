'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ErrorAlert } from '@/components/error-alert';
import { Pager } from '@/components/pager';
import { apiFetch, errorMessages } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { totalPages } from '@/lib/pagination';
import { ROLE_LABELS, ROLES } from '@/lib/permissions';
import type { ManagedUser, Paginated, Role } from '@/lib/types';

const PAGE_SIZE = 20;

/** Tabela de contas com o perfil editável (só Admin; a API recusa com 403 para os demais). */
export function UsersAdmin({ page }: { page: number }) {
  const { token, user: me } = useAuth();
  const [result, setResult] = useState<Paginated<ManagedUser> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Trocar de página antes da resposta anterior chegar não pode mostrar a lista errada
    let current = true;
    apiFetch<Paginated<ManagedUser>>(`/users?page=${page}&limit=${PAGE_SIZE}`, { token })
      .then((data) => current && setResult(data))
      .catch((error: unknown) => current && setErrors(errorMessages(error)));
    return () => {
      current = false;
    };
  }, [page, token]);

  const changeRole = async (account: ManagedUser, role: Role) => {
    setErrors([]);
    setSaving(account.id);
    try {
      const updated = await apiFetch<ManagedUser>(`/users/${account.id}/role`, {
        method: 'PATCH',
        body: { role },
        token,
      });
      setResult((current) =>
        current && { ...current, data: current.data.map((item) => (item.id === updated.id ? updated : item)) },
      );
    } catch (error) {
      // O select volta sozinho para o perfil atual: ele reflete o estado, que não mudou
      setErrors(errorMessages(error));
    } finally {
      setSaving(null);
    }
  };

  if (!result) {
    return errors.length > 0 ? <ErrorAlert messages={errors} /> : <p className="text-sm text-muted">Carregando...</p>;
  }
  return (
    <div className="space-y-4">
      <ErrorAlert messages={errors} />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs tracking-[0.08em] text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Perfil
              </th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">
                Desde
              </th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((account) => (
              <tr key={account.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {account.name}
                  {account.id === me?.id && <span className="ml-1.5 text-xs text-muted">(você)</span>}
                </td>
                <td className="px-4 py-3 text-muted">{account.email}</td>
                <td className="px-4 py-3">
                  <label htmlFor={`perfil-${account.id}`} className="sr-only">
                    Perfil de {account.name}
                  </label>
                  <select
                    id={`perfil-${account.id}`}
                    value={account.role}
                    disabled={saving === account.id}
                    onChange={(event) => void changeRole(account, event.target.value as Role)}
                    className="h-9 rounded-md border border-border bg-surface px-2 text-sm disabled:opacity-60"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">
                  <time dateTime={account.createdAt}>{formatDateTime(account.createdAt)}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        label="Páginas de usuários"
        page={page}
        totalPages={totalPages(result.meta.total, PAGE_SIZE)}
        href={(n) => `/admin/usuarios?page=${n}`}
      />
    </div>
  );
}
