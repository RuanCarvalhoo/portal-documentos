export interface TreeRow {
  id: string;
  title: string;
  parentId: string | null;
}

export interface TreeNode {
  id: string;
  title: string;
  children: TreeNode[];
}

/**
 * Monta a árvore de páginas em O(n) a partir de uma lista plana (uma única query, sem N+1).
 * As linhas devem vir já ordenadas por posição: a ordem de entrada é a ordem entre irmãos.
 */
export function buildTree(rows: readonly TreeRow[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(
    rows.map((row) => [row.id, { id: row.id, title: row.title, children: [] }]),
  );
  const roots: TreeNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id) as TreeNode;
    const parent = row.parentId === null ? undefined : nodes.get(row.parentId);
    // Pai ausente não deveria acontecer (FK), mas a página não some da navegação por isso
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

/**
 * Diz se `candidateId` é a própria página ou uma descendente dela, subindo a cadeia de pais.
 * Usado para bloquear ciclos: mover uma página para dentro de si mesma ou de uma subpágina.
 */
export function isSelfOrDescendant(
  pageId: string,
  candidateId: string,
  parentById: ReadonlyMap<string, string | null>,
): boolean {
  const visited = new Set<string>();
  let current: string | null | undefined = candidateId;
  while (current) {
    if (current === pageId) {
      return true;
    }
    // Dados corrompidos com laço: para em vez de rodar para sempre
    if (visited.has(current)) {
      return false;
    }
    visited.add(current);
    current = parentById.get(current);
  }
  return false;
}

/**
 * Teto de níveis da árvore de páginas. Documentação raramente passa de 4 ou 5 níveis; o teto
 * existe porque uma cadeia de milhares de páginas aninhadas estoura a pilha ao serializar
 * /navigation (e a barra lateral de todo o portal).
 */
export const MAX_TREE_DEPTH = 10;

/** Nível da página na árvore (raiz = 1), subindo a cadeia de pais. */
export function depthOf(pageId: string, parentById: ReadonlyMap<string, string | null>): number {
  const visited = new Set<string>();
  let current: string | null | undefined = pageId;
  // Dados corrompidos com laço: para em vez de rodar para sempre
  while (current && !visited.has(current)) {
    visited.add(current);
    current = parentById.get(current);
  }
  return visited.size;
}

/** Quantos níveis a página e suas descendentes ocupam (página sem filhas = 1). */
export function subtreeHeight(pageId: string, parentById: ReadonlyMap<string, string | null>): number {
  const childrenById = new Map<string, string[]>();
  for (const [id, parentId] of parentById) {
    // Map local da função: push em vez de copiar o array a cada filha (que seria O(n²))
    const siblings = parentId ? childrenById.get(parentId) : undefined;
    if (siblings) {
      siblings.push(id);
    } else if (parentId) {
      childrenById.set(parentId, [id]);
    }
  }
  const visited = new Set<string>();
  let level = [pageId];
  let height = 0;
  while (level.length > 0) {
    height += 1;
    level.forEach((id) => visited.add(id));
    level = level.flatMap((id) => childrenById.get(id) ?? []).filter((id) => !visited.has(id));
  }
  return height;
}
