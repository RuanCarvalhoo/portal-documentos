import type { TreeNode } from './types';

/**
 * Ids dos ancestrais de uma página, da raiz até o pai (sem a própria página),
 * ou null se ela não está na árvore. Usado para abrir a sidebar até a página ativa.
 */
export function findAncestorIds(nodes: readonly TreeNode[], targetId: string): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [];
    }
    const below = findAncestorIds(node.children, targetId);
    if (below) {
      return [node.id, ...below];
    }
  }
  return null;
}

/** Total de páginas de uma árvore, em todos os níveis. */
export function countPages(nodes: readonly TreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countPages(node.children), 0);
}

export interface TreeOption {
  id: string;
  title: string;
  depth: number;
}

/**
 * Árvore em lista plana (com profundidade) para o seletor de página pai. `excludeId` remove a
 * página e toda a subárvore dela: ninguém pode escolher a si mesmo ou uma subpágina como pai.
 */
export function flattenTree(nodes: readonly TreeNode[], excludeId?: string, depth = 0): TreeOption[] {
  return nodes.flatMap((node) =>
    node.id === excludeId
      ? []
      : [{ id: node.id, title: node.title, depth }, ...flattenTree(node.children, excludeId, depth + 1)],
  );
}
