// Enquanto a próxima página espera a API, a barra lateral e o header continuam na tela e a
// área de conteúdo mostra que algo está acontecendo (sem isso, o clique parece não ter efeito)
export default function Loading() {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-sm text-muted">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground motion-reduce:animate-none"
      />
      Carregando...
    </div>
  );
}
