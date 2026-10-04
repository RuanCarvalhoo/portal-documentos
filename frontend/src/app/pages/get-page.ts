import { cache } from 'react';
import { getOrNotFound } from '@/lib/server-api';
import type { Page } from '@/lib/types';

// cache: generateMetadata e a página pedem a mesma página numa única requisição à API
export const getPage = cache((id: string) => getOrNotFound<Page>('pages', id));
