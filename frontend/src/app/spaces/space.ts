import { cache } from 'react';
import { getOrNotFound } from '@/lib/server-api';
import type { Space } from '@/lib/types';

// cache: generateMetadata e a página pedem o mesmo espaço numa única requisição à API
export const getSpace = cache((id: string) => getOrNotFound<Space>('spaces', id));
