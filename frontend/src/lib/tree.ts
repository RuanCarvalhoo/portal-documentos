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
