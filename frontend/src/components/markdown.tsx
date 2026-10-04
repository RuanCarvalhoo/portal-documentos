import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

const components: Components = {
  // Links externos abrem em outra aba, sem dar acesso a esta (noopener)
  a: ({ href, children }) =>
    href?.startsWith('http') ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    ),
  // Imagens do Markdown têm URLs arbitrárias: next/image exigiria cadastrar cada domínio
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" />,
};

/**
 * Renderiza o Markdown das páginas: o mesmo componente na leitura e no preview do editor.
 * Segurança: sem rehype-raw, HTML escrito no Markdown aparece como texto e nunca é executado
 * (sem XSS); o urlTransform padrão do react-markdown descarta links javascript:.
 */
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-portal max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
