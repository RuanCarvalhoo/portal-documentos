import GithubSlugger from 'github-slugger';

export interface TocItem {
  depth: 2 | 3;
  text: string;
  /** Mesmo id que o rehype-slug põe no título renderizado (âncora #id) */
  id: string;
}

const FENCE = /^(```|~~~)/;
const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Sumário da página a partir dos títulos ## e ### do Markdown (ignorando blocos de código).
 * Todo título consome um slug, na ordem, como o rehype-slug faz: títulos repetidos recebem
 * -1, -2... e os ids batem com os do HTML.
 */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (FENCE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    const match = inFence ? null : ATX_HEADING.exec(line);
    if (!match) {
      continue;
    }
    const depth = match[1].length;
    const text = plainText(match[2]);
    const id = slugger.slug(text);
    if (depth === 2 || depth === 3) {
      items.push({ depth, text, id });
    }
  }
  return items;
}

// Texto visível do título: [link](url) vira "link"; marcação de ênfase e código some
function plainText(inline: string): string {
  return inline
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
