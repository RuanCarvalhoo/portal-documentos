import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

// Inclui "//site.com" (relativo ao protocolo): começa com "/", mas é outro site
const EXTERNAL = /^(https?:)?\/\//;

const components: Components = {
  a: ({ href = '', children }) =>
    EXTERNAL.test(href) ? (
      // Externo: outra aba, sem dar à página aberta acesso a esta (noopener)
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : href.startsWith('/') && !href.startsWith('/api/') ? (
      // Interno: navegação do cliente, sem recarregar o portal (/api/... é arquivo, como uma imagem)
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href}>{children}</a>
    ),
  // Imagens do Markdown têm URLs arbitrárias: next/image exigiria cadastrar cada domínio
  img: ({ src, alt }) => {
    const url = typeof src === 'string' ? src : undefined;
    // eslint-disable-next-line @next/next/no-img-element
    const image = <img src={url} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" />;
    // Imagens enviadas ao portal (diagramas, prints) abrem em tamanho real numa nova aba
    return url?.startsWith('/api/uploads/') ? (
      <a href={url} target="_blank" rel="noopener" title="Abrir a imagem em tamanho real">
        {image}
      </a>
    ) : (
      image
    );
  },
  // Tabelas largas rolam na horizontal em vez de estourar a coluna de texto
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

interface MarkdownContentProps {
  content: string;
  /** Ids nos títulos (âncoras do sumário). Desligado no preview do editor, onde colidiriam
   * com os ids dos campos do formulário. */
  anchors?: boolean;
}

/**
 * Renderiza o Markdown das páginas: o mesmo componente na leitura e no preview do editor.
 * Segurança: sem rehype-raw, HTML escrito no Markdown é descartado e nunca chega ao DOM (sem
 * XSS); o urlTransform padrão do react-markdown remove URLs javascript: e data: de links e
 * imagens.
 */
export function MarkdownContent({ content, anchors = true }: MarkdownContentProps) {
  return (
    <div className="prose prose-portal max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={anchors ? [rehypeSlug, rehypeHighlight] : [rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
