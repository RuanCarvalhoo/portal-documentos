// Seed idempotente: roda a cada start do container (npm run db:seed).
// Tudo numa transação com advisory lock (se falhar no meio, nada fica pela metade e o
// próximo start tenta de novo; instâncias concorrentes não duplicam):
// - Usuário demo: criado só se o e-mail não existir.
// - Espaços/páginas: criados só se ainda não houver nenhum espaço.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

// Credenciais de DEMONSTRAÇÃO, documentadas no README para o avaliador — não são segredo.
const DEMO_USER = {
  name: 'Usuário Demo',
  email: 'demo@example.com',
  password: 'demo1234',
};
const BCRYPT_ROUNDS = 10;
const FENCE = '```';

interface PageSeed {
  title: string;
  content: string;
  children?: PageSeed[];
}

interface SpaceSeed {
  name: string;
  description: string;
  pages: PageSeed[];
}

const MARKDOWN_GUIDE = `Esta página mostra **todos os elementos de Markdown** suportados pelo portal. Use-a como referência ao escrever.

## Títulos

Use \`#\` a \`######\` para criar títulos. O sumário da página é gerado a partir deles.

### Ênfase

Texto em **negrito**, em *itálico*, ~~riscado~~ e \`código inline\`.

## Listas

- Item de lista
- Outro item
  - Item aninhado

1. Primeiro passo
2. Segundo passo
3. Terceiro passo

- [x] Tarefa concluída
- [ ] Tarefa pendente

## Tabela

| Método | Rota | Autenticação |
| ------ | ---- | ------------ |
| GET | \`/spaces\` | Pública |
| POST | \`/spaces\` | Obrigatória |
| DELETE | \`/pages/:id\` | Obrigatória |

## Links e imagens

Consulte o [guia oficial de Markdown](https://commonmark.org/help/).

![Diagrama de exemplo](https://placehold.co/800x240/png?text=Diagrama+de+exemplo)

## Citação

> Documentação boa é documentação atualizada.

## Blocos de código

${FENCE}typescript
interface Page {
  id: string;
  title: string;
  children: Page[];
}

export function countPages(pages: Page[]): number {
  return pages.reduce((total, page) => total + 1 + countPages(page.children), 0);
}
${FENCE}

${FENCE}bash
docker compose up --build
${FENCE}

---

Fim do guia.`;

const SPACES: SpaceSeed[] = [
  {
    name: 'Arquitetura',
    description: 'Visão geral da arquitetura do sistema, decisões técnicas e padrões do backend.',
    pages: [
      {
        title: 'Introdução',
        content: `## Visão geral

Este documento descreve a arquitetura do sistema: um frontend web que consome uma API REST, que por sua vez persiste os dados em um banco relacional.

## Estrutura

${FENCE}typescript
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(3001);
${FENCE}

## Princípios

- Simplicidade antes de abstração
- Toda decisão relevante é registrada em um ADR
- O backend é a fonte da verdade das regras de negócio`,
      },
      {
        title: 'Backend',
        content: `O backend é uma API REST organizada em **módulos por domínio** (autenticação, espaços, páginas e busca).

Cada módulo tem *controller* (HTTP), *service* (regras de negócio) e DTOs (validação de entrada).`,
        children: [
          {
            title: 'API',
            content: `## Convenções

- Recursos no plural: \`/spaces\`, \`/pages\`
- Listagens paginadas com \`?page=\` e \`?limit=\` (máximo 50)
- Erros sempre no mesmo formato:

${FENCE}json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Página não encontrada",
  "path": "/pages/123",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
${FENCE}`,
          },
          {
            title: 'Autenticação',
            content: `A autenticação usa **JWT**. O token é obtido em \`POST /auth/login\` e enviado no header:

${FENCE}http
Authorization: Bearer <token>
${FENCE}

Leitura é pública; criar, editar e excluir exigem login.`,
          },
          {
            title: 'Banco de dados',
            content: `PostgreSQL com Prisma. As páginas formam uma **árvore** por lista de adjacência (\`parentId\`).

| Tabela | Descrição |
| ------ | --------- |
| \`users\` | Usuários |
| \`spaces\` | Espaços de documentação |
| \`pages\` | Páginas em Markdown |`,
            children: [
              {
                title: 'Migrations',
                content: `As migrations são aplicadas automaticamente quando o container da API sobe:

${FENCE}bash
npm run db:deploy
${FENCE}

Nunca edite uma migration já aplicada — crie uma nova.`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Onboarding',
    description: 'Tudo o que uma pessoa nova no time precisa para começar.',
    pages: [
      {
        title: 'Ambiente de desenvolvimento',
        content: `Para rodar o projeto você só precisa do **Docker**.

${FENCE}bash
git clone <url-do-repositorio>
docker compose up --build
${FENCE}`,
        children: [
          {
            title: 'Variáveis de ambiente',
            content: `Os valores padrão já estão no \`docker-compose.yml\`. Para rodar fora do Docker, copie \`.env.example\` para \`.env\`.

> Os valores padrão servem **apenas para desenvolvimento**.`,
          },
          {
            title: 'Ferramentas recomendadas',
            content: `- Node.js 24
- Um editor com suporte a TypeScript
- Um cliente HTTP para testar a API (ou o Swagger em \`/docs\`)`,
          },
        ],
      },
      {
        title: 'Primeiro acesso',
        content: `1. Acesse o portal em \`http://localhost:3000\`
2. Clique em **Entrar** e use o usuário de demonstração
3. Navegue pelos espaços na barra lateral
4. Crie sua primeira página dentro de um espaço`,
      },
    ],
  },
  {
    name: 'Guias',
    description: 'Guias práticos de escrita e uso do portal.',
    pages: [
      { title: 'Guia de Markdown', content: MARKDOWN_GUIDE },
      {
        title: 'Boas práticas de documentação',
        content: `- Escreva para quem vai ler, não para quem escreveu
- Prefira exemplos curtos e executáveis
- Mantenha cada página focada em um assunto`,
        children: [
          {
            title: 'Escrevendo bons títulos',
            content: `Um bom título diz **o que** a página resolve: "Como configurar o ambiente" é melhor do que "Ambiente".`,
          },
        ],
      },
    ],
  },
];

async function createPages(
  tx: Prisma.TransactionClient,
  spaceId: string,
  authorId: string,
  pages: PageSeed[],
  parentId: string | null,
): Promise<number> {
  let created = 0;
  for (const [position, page] of pages.entries()) {
    const { id } = await tx.page.create({
      data: {
        title: page.title,
        content: page.content,
        position,
        spaceId,
        parentId,
        createdById: authorId,
        updatedById: authorId,
      },
      select: { id: true },
    });
    created += 1 + (await createPages(tx, spaceId, authorId, page.children ?? [], id));
  }
  return created;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const pageCount = await prisma.$transaction(
      async (tx) => {
        // Lock da transação: duas instâncias subindo juntas não fazem o "conta e insere" ao
        // mesmo tempo (a segunda espera e então vê os espaços já criados).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;

        const user =
          (await tx.user.findUnique({ where: { email: DEMO_USER.email }, select: { id: true } })) ??
          (await tx.user.create({
            data: {
              name: DEMO_USER.name,
              email: DEMO_USER.email,
              passwordHash: await hash(DEMO_USER.password, BCRYPT_ROUNDS),
            },
            select: { id: true },
          }));

        if ((await tx.space.count()) > 0) {
          return null;
        }
        let total = 0;
        for (const space of SPACES) {
          const { id } = await tx.space.create({
            data: { name: space.name, description: space.description },
            select: { id: true },
          });
          total += await createPages(tx, id, user.id, space.pages, null);
        }
        return total;
      },
      { timeout: 30_000 },
    );
    console.info(
      pageCount === null
        ? 'Seed: espaços já existem, nada a criar.'
        : `Seed: ${SPACES.length} espaços e ${pageCount} páginas criados.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed falhou:', error);
  process.exit(1);
});
