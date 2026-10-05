/**
 * Conteúdo do portal: a própria documentação do projeto (docs/), organizada em espaços.
 * Cada página aponta para um arquivo de docs/; o título vem do primeiro "# …" do arquivo, a
 * menos que `title` o substitua (títulos curtos ficam melhores na barra lateral).
 */
export type Author = 'admin' | 'editor';

export interface PageEntry {
  /** Arquivo relativo a docs/ */
  file: string;
  title?: string;
  tags: string[];
  /** Quem criou; `editedBy` (padrão: o mesmo) é quem aparece em "editada por" */
  author: Author;
  editedBy?: Author;
  /**
   * Versão anterior (arquivo relativo a prisma/seed/): a página nasce com ela e é editada para
   * o texto atual, o que deixa a versão 1 no histórico
   */
  draft?: string;
  children?: PageEntry[];
}

export interface SpaceEntry {
  name: string;
  description: string;
  pages: PageEntry[];
}

// Links para arquivos do repositório que não viram página (ex.: o schema do Prisma)
export const REPOSITORY_URL = 'https://github.com/RuanCarvalhoo/portal-documentos/blob/main';

const adr = (file: string, ...tags: string[]): PageEntry => ({
  file: `adr/${file}`,
  tags: ['adr', ...tags],
  author: 'admin',
});

export const SPACES: SpaceEntry[] = [
  {
    name: 'Arquitetura',
    description: 'Como o portal é montado: containers, camadas, fluxos e dados.',
    pages: [
      {
        file: 'arquitetura/visao-geral.md',
        title: 'Visão geral',
        tags: ['arquitetura', 'docker', 'visao-geral'],
        author: 'admin',
        editedBy: 'editor',
        draft: 'visao-geral-v1.md',
        children: [
          {
            file: 'arquitetura/backend.md',
            title: 'Backend',
            tags: ['arquitetura', 'backend', 'nestjs'],
            author: 'admin',
          },
          {
            file: 'arquitetura/frontend.md',
            title: 'Frontend',
            tags: ['arquitetura', 'frontend', 'nextjs'],
            author: 'admin',
            editedBy: 'editor',
          },
          {
            file: 'banco-de-dados.md',
            tags: ['arquitetura', 'banco-de-dados', 'postgresql'],
            author: 'admin',
          },
          {
            file: 'arquitetura/fluxos.md',
            title: 'Fluxos principais',
            tags: ['arquitetura', 'fluxos'],
            author: 'editor',
          },
        ],
      },
    ],
  },
  {
    name: 'Operação',
    description: 'Logs, segurança, pontos de falha e como o portal escala.',
    pages: [
      {
        file: 'arquitetura/observabilidade.md',
        title: 'Observabilidade e logs',
        tags: ['operacao', 'logs', 'observabilidade'],
        author: 'admin',
      },
      {
        file: 'arquitetura/escalabilidade.md',
        title: 'Pontos de falha e escalabilidade',
        tags: ['operacao', 'escalabilidade', 'gargalos'],
        author: 'admin',
      },
      { file: 'seguranca.md', tags: ['operacao', 'seguranca'], author: 'admin' },
    ],
  },
  {
    name: 'Decisões (ADRs)',
    description: 'Por que cada escolha foi feita: contexto, alternativas e quando eu mudaria de ideia.',
    pages: [
      adr('001-banco-de-dados-postgresql.md', 'banco-de-dados', 'postgresql'),
      adr('002-modelagem-da-arvore.md', 'banco-de-dados', 'arvore'),
      adr('003-busca-trigram.md', 'busca', 'postgresql'),
      adr('004-autenticacao-jwt.md', 'seguranca', 'autenticacao'),
      adr('005-concorrencia-otimista.md', 'concorrencia'),
      adr('006-cache-da-navegacao.md', 'cache', 'escalabilidade'),
      adr('007-historico-de-versoes.md', 'historico', 'postgresql'),
      adr('008-proxy-da-api-no-frontend.md', 'frontend', 'proxy'),
      adr('009-logs-estruturados.md', 'logs', 'observabilidade'),
      adr('010-armazenamento-de-imagens.md', 'imagens', 'postgresql'),
      adr('011-tags.md', 'tags'),
      adr('012-perfis-de-acesso.md', 'seguranca', 'perfis'),
    ],
  },
  {
    name: 'Guias',
    description: 'Como escrever e organizar documentação no portal.',
    pages: [
      { file: 'guias/escrevendo-no-portal.md', tags: ['guia', 'onboarding'], author: 'editor' },
      { file: 'guias/markdown.md', tags: ['guia', 'markdown'], author: 'editor' },
    ],
  },
];
