import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Página não encontrada</h1>
      <p className="mt-3 text-muted">O endereço pode estar errado ou o conteúdo foi excluído.</p>
      <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">
        Voltar para o início
      </Link>
    </div>
  );
}
