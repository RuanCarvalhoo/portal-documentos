import Link from 'next/link';

interface PagerProps {
  /** Nome acessível da navegação (ex.: "Páginas de resultados") */
  label: string;
  page: number;
  totalPages: number;
  href: (page: number) => string;
}

/** Anterior · "Página X de Y" · Próxima. Não renderiza nada quando há uma página só. */
export function Pager({ label, page, totalPages, href }: PagerProps) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="underline underline-offset-4">
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="underline underline-offset-4">
          Próxima
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
