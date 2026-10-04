import { notFound } from 'next/navigation';
import { ApiError, apiFetch } from './api';

/** Leitura em Server Component: id inexistente ou malformado vira a página 404 do portal. */
export async function getOrNotFound<T>(path: string): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }
}
