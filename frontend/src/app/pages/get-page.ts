import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getOrNotFound } from '@/lib/server-api';
import type { Page, PageVersion, PageVersionSummary, Paginated } from '@/lib/types';

export const VERSIONS_PAGE_SIZE = 20;
// Número de versão na URL: só dígitos (nada além disso chega ao caminho da API)
const VERSION_NUMBER = /^[1-9]\d{0,9}$/;

// cache: generateMetadata e a página pedem a mesma página numa única requisição à API
export const getPage = cache((id: string) => getOrNotFound<Page>('pages', id));

export const getPageVersions = (id: string, page: number) =>
  getOrNotFound<Paginated<PageVersionSummary>>(
    'pages',
    id,
    `/versions?page=${page}&limit=${VERSIONS_PAGE_SIZE}`,
  );

export const getPageVersion = cache((id: string, version: string) => {
  if (!VERSION_NUMBER.test(version)) {
    notFound();
  }
  return getOrNotFound<PageVersion>('pages', id, `/versions/${version}`);
});
