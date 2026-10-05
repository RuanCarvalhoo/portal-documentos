import type { Metadata } from 'next';
import Link from 'next/link';
import { MarkdownContent } from '@/components/markdown';
import { AuthOnly } from '@/components/require-auth';
import { primaryButton, secondaryButton } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { getPage, getPageVersion } from '../../../get-page';

export async function generateMetadata({ params }: PageProps<'/pages/[id]/versions/[version]'>): Promise<Metadata> {
  const { id, version } = await params;
  return { title: `Versão ${version} de ${(await getPageVersion(id, version)).title}` };
}

export default async function PageVersionView({ params }: PageProps<'/pages/[id]/versions/[version]'>) {
  const { id, version: versionParam } = await params;
  const [current, version] = await Promise.all([getPage(id), getPageVersion(id, versionParam)]);

  return (
    <article>
      <Link href={`/pages/${id}/versions`} className="inline-block py-1 text-sm text-muted hover:text-foreground">
        ← Histórico de {current.title}
      </Link>

      <div role="note" className="mt-4 rounded-md border border-border bg-surface px-4 py-3 text-sm">
        <p>
          Você está vendo a <strong>versão {version.version}</strong>, escrita por {version.editedBy.name} em{' '}
          <time dateTime={version.editedAt}>{formatDateTime(version.editedAt)}</time>. Esta não é a versão atual.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/pages/${id}`} className={secondaryButton}>
            Ver a versão atual
          </Link>
          <AuthOnly role="EDITOR">
            {/* Restaurar não sobrescreve nada direto: abre o editor com este texto, e salvar cria uma
                versão nova (a atual vai para o histórico) */}
            <Link href={`/pages/${id}/edit?fromVersion=${version.version}`} className={primaryButton}>
              Restaurar esta versão
            </Link>
          </AuthOnly>
        </div>
      </div>

      <h1 className="mt-8 font-serif text-4xl tracking-tight sm:text-5xl">{version.title}</h1>
      <div className="mt-8 border-t border-border pt-8">
        {version.content.trim() ? (
          <MarkdownContent content={version.content} />
        ) : (
          <p className="text-muted">Esta versão não tinha conteúdo.</p>
        )}
      </div>
    </article>
  );
}
