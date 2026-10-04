'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useSyncExternalStore } from 'react';
import { findAncestorIds } from '@/lib/tree';
import type { NavigationSpace, TreeNode } from '@/lib/types';
import { ChevronRightIcon, PlusIcon } from './icons';
import { AuthOnly } from './require-auth';

// Escolhas explícitas de abrir/fechar (id → aberto), persistidas no localStorage.
// Store externo lido com useSyncExternalStore: sem setState em efeito e sem divergência
// de hidratação (o servidor sempre vê "nenhuma escolha").
const EXPANDED_KEY = 'portal-docs:expanded';
const listeners = new Set<() => void>();
let memory: string | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string {
  if (memory === null) {
    try {
      memory = localStorage.getItem(EXPANDED_KEY) ?? '{}';
    } catch {
      memory = '{}';
    }
  }
  return memory;
}

const getServerSnapshot = (): string => '{}';

function parseChoices(raw: string): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
}

function setChoice(id: string, open: boolean): void {
  memory = JSON.stringify({ ...parseChoices(getSnapshot()), [id]: open });
  try {
    localStorage.setItem(EXPANDED_KEY, memory);
  } catch {
    // Armazenamento bloqueado: a escolha vale só para esta visita
  }
  listeners.forEach((listener) => listener());
}

interface SidebarProps {
  navigation: NavigationSpace[] | null;
}

/** Barra lateral global: todos os espaços, cada um com sua árvore de páginas recolhível. */
export function Sidebar({ navigation }: SidebarProps) {
  const pathname = usePathname();
  const activePageId = pathname.match(/^\/pages\/([^/]+)/)?.[1] ?? null;
  const activeSpaceId = pathname.match(/^\/spaces\/([^/]+)/)?.[1] ?? null;

  // Ancestrais da página ativa abrem sozinhos (também no HTML do servidor)
  const ancestors = useMemo(() => {
    if (!activePageId || !navigation) {
      return new Set<string>();
    }
    for (const space of navigation) {
      const found = findAncestorIds(space.pages, activePageId);
      if (found) {
        return new Set(found);
      }
    }
    return new Set<string>();
  }, [activePageId, navigation]);

  const choices = parseChoices(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
  // A escolha explícita vence a abertura automática: dá para recolher até um ancestral
  const isOpen = (id: string): boolean => choices[id] ?? ancestors.has(id);
  const toggle = (id: string) => setChoice(id, !isOpen(id));

  return (
    <nav aria-label="Espaços e páginas" className="px-3 py-6 text-sm">
      {navigation === null && (
        <p className="px-2 text-muted">Não foi possível carregar a navegação. Recarregue a página.</p>
      )}
      {navigation?.length === 0 && <p className="px-2 text-muted">Nenhum espaço criado ainda.</p>}
      {navigation?.map((space) => (
        <section key={space.id} className="mb-6">
          <Link
            href={`/spaces/${space.id}`}
            aria-current={activeSpaceId === space.id ? 'page' : undefined}
            className="block truncate rounded px-2 py-1 text-xs font-semibold tracking-[0.08em] text-muted uppercase transition-colors hover:text-foreground aria-[current=page]:text-foreground"
          >
            {space.name}
          </Link>
          {space.pages.length > 0 ? (
            <PageTree nodes={space.pages} level={0} isOpen={isOpen} activeId={activePageId} onToggle={toggle} />
          ) : (
            <p className="px-2 py-1 text-xs text-muted">Sem páginas</p>
          )}
        </section>
      ))}
      <AuthOnly>
        <Link
          href="/spaces/new"
          className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          <PlusIcon /> Novo espaço
        </Link>
      </AuthOnly>
    </nav>
  );
}

interface PageTreeProps {
  id?: string;
  nodes: TreeNode[];
  level: number;
  isOpen: (id: string) => boolean;
  activeId: string | null;
  onToggle: (id: string) => void;
}

function PageTree({ id, nodes, level, isOpen, activeId, onToggle }: PageTreeProps) {
  return (
    <ul id={id} className="mt-1 space-y-px">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const open = isOpen(node.id);
        const active = node.id === activeId;
        return (
          <li key={node.id}>
            <div
              className={`group flex items-center gap-1 rounded-md pr-2 transition-colors hover:bg-hover ${active ? 'bg-hover font-medium text-foreground' : 'text-foreground/80'}`}
              style={{ paddingLeft: `${level * 14 + 2}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  aria-expanded={open}
                  aria-controls={`subpaginas-${node.id}`}
                  aria-label={`Subpáginas de ${node.title}`}
                  className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-foreground pointer-coarse:size-9"
                >
                  <ChevronRightIcon width={14} height={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <span className="size-6 shrink-0 pointer-coarse:size-9" />
              )}
              <Link
                href={`/pages/${node.id}`}
                aria-current={active ? 'page' : undefined}
                className="min-w-0 flex-1 truncate py-1 pointer-coarse:py-2.5"
              >
                {node.title}
              </Link>
            </div>
            {hasChildren && open && (
              <PageTree id={`subpaginas-${node.id}`} nodes={node.children} level={level + 1} isOpen={isOpen} activeId={activeId} onToggle={onToggle} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
