import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export interface TocItem {
  depth: 2 | 3;
  text: string;
  /** Mesmo id que o título renderizado recebe (âncora #id) */
  id: string;
}

// O mesmo pipeline que o react-markdown monta em MarkdownContent (remark-parse + remark-gfm +
// remark-rehype com as opções dele + rehype-slug). Em vez de reimplementar o parser com regex
// (frágil e sujeito a ReDoS com entrada maliciosa), lemos os títulos já com os ids finais:
// eles batem com o HTML por construção, inclusive em fences, títulos setext e repetidos.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug);

/** Sumário da página: títulos ## e ### do Markdown, na ordem, com os ids das âncoras. */
export function extractToc(markdown: string): TocItem[] {
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  const items: TocItem[] = [];
  visit(tree, 'element', (node: Element) => {
    if ((node.tagName === 'h2' || node.tagName === 'h3') && typeof node.properties.id === 'string') {
      items.push({ depth: node.tagName === 'h2' ? 2 : 3, text: toString(node), id: node.properties.id });
    }
  });
  return items;
}
