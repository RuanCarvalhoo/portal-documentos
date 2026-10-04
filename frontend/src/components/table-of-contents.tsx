import type { TocItem } from '@/lib/toc';

/** Sumário da página: links para os títulos ## e ### (âncoras geradas pelo rehype-slug). */
export function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <ul role="list" className="space-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.id} className={item.depth === 3 ? 'pl-3' : ''}>
          <a href={`#${item.id}`} className="text-muted transition-colors hover:text-foreground">
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
