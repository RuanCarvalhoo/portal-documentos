import Link from 'next/link';
import { tagHref } from '@/lib/tags';

/** Tags de uma página como links para a lista de páginas de cada uma. */
export function TagList({ tags, className = '' }: { tags: string[]; className?: string }) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <ul role="list" aria-label="Tags" className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={tagHref(tag)}
            className="inline-flex items-center rounded-md bg-accent-bg px-2 py-0.5 text-xs text-accent-fg transition-opacity hover:opacity-80"
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
