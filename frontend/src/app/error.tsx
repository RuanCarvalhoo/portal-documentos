'use client';

/** Erro inesperado ao carregar uma rota (ex.: API fora do ar). 404 tem página própria. */
export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Algo deu errado</h1>
      <p className="mt-3 text-muted">Não foi possível carregar este conteúdo agora. A API pode estar indisponível.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Tentar de novo
      </button>
    </div>
  );
}
