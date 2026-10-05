// Seed idempotente: roda a cada start do container (npm run db:seed).
// Tudo numa transação com advisory lock (se falhar no meio, nada fica pela metade e o
// próximo start tenta de novo; instâncias concorrentes não duplicam):
// - Contas de demonstração (uma por perfil): garantidas a cada start, com o perfil certo.
// - Conteúdo: só num banco sem espaços. É a própria documentação do projeto, lida de docs/
//   (Markdown e diagramas), com os diagramas enviados como imagens e os links entre documentos
//   trocados por links para as páginas do portal.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { Prisma, PrismaClient, Role } from '../src/generated/prisma/client';
import { MAX_CONTENT_LENGTH } from '../src/pages/page-limits';
import { normalizeTag } from '../src/tags/tags.util';
import { detectImageType } from '../src/uploads/upload.util';
import { type Author, type PageEntry, REPOSITORY_URL, SPACES } from './seed/manifest';
import { localImages, rewriteLinks, splitTitle } from './seed/markdown';

// Credenciais de DEMONSTRAÇÃO, documentadas no README para o avaliador — não são segredo.
// Uma conta por perfil (ADR 012); admin e editor assinam o conteúdo.
const DEMO_USERS = [
  { key: 'admin', name: 'Admin Demo', email: 'demo@example.com', password: 'demo1234', role: Role.ADMIN },
  {
    key: 'editor',
    name: 'Editora Demo',
    email: 'editor@example.com',
    password: 'editor1234',
    role: Role.EDITOR,
  },
  {
    key: 'reader',
    name: 'Leitor Demo',
    email: 'leitor@example.com',
    password: 'leitor1234',
    role: Role.READER,
  },
] as const;
const BCRYPT_ROUNDS = 10;

// No container a documentação é copiada para /app/docs (SEED_DOCS_DIR); fora dele, é a pasta
// docs/ na raiz do repositório
const DOCS_DIR = process.env.SEED_DOCS_DIR ?? resolve(__dirname, '../../docs');
const DRAFTS_DIR = join(__dirname, 'seed');

type Tx = Prisma.TransactionClient;

interface LoadedPage {
  entry: PageEntry;
  id: string;
  title: string;
  body: string;
}

const flatten = (pages: PageEntry[]): PageEntry[] =>
  pages.flatMap((page) => [page, ...flatten(page.children ?? [])]);

/** Lê cada documento e já sorteia o id da página (os links entre documentos precisam dele). */
function loadDocuments(): Map<string, LoadedPage> {
  const loaded = new Map<string, LoadedPage>();
  for (const entry of SPACES.flatMap((space) => flatten(space.pages))) {
    const { title, body } = splitTitle(readFileSync(join(DOCS_DIR, entry.file), 'utf8'));
    // uuid v4 aqui (o padrão do banco é v7): são poucas linhas, e o id precisa existir antes do
    // INSERT para os links apontarem para as páginas certas numa única passada
    loaded.set(entry.file, { entry, id: randomUUID(), title: entry.title ?? title, body });
  }
  return loaded;
}

/** Envia os diagramas referenciados como uploads (o sha256 reaproveita os que já existem). */
async function uploadImages(
  tx: Tx,
  documents: Map<string, LoadedPage>,
  uploadedById: string,
): Promise<Map<string, string>> {
  const paths = new Set([...documents.values()].flatMap(({ entry, body }) => localImages(body, entry.file)));
  const ids = new Map<string, string>();
  for (const path of paths) {
    const data = readFileSync(join(DOCS_DIR, path));
    const mimeType = detectImageType(data);
    if (!mimeType) {
      throw new Error(`Imagem em formato não suportado: ${path}`);
    }
    const sha256 = createHash('sha256').update(data).digest('hex');
    const { id } = await tx.upload.upsert({
      where: { sha256 },
      update: {},
      create: {
        fileName: basename(path),
        mimeType,
        size: data.length,
        sha256,
        data: new Uint8Array(data),
        uploadedById,
      },
      select: { id: true },
    });
    ids.set(path, id);
  }
  return ids;
}

async function tagLinks(tx: Tx, names: string[]): Promise<{ tagId: string }[]> {
  const normalized = names.map(normalizeTag);
  await tx.tag.createMany({ data: normalized.map((name) => ({ name })), skipDuplicates: true });
  const tags = await tx.tag.findMany({ where: { name: { in: normalized } }, select: { id: true } });
  return tags.map(({ id }) => ({ tagId: id }));
}

async function createPages(
  tx: Tx,
  spaceId: string,
  entries: PageEntry[],
  parentId: string | null,
  pages: Map<string, LoadedPage & { content: string }>,
  authors: Record<Author, string>,
): Promise<number> {
  let created = 0;
  for (const [position, entry] of entries.entries()) {
    const page = pages.get(entry.file)!;
    const author = authors[entry.author];
    const editor = authors[entry.editedBy ?? entry.author];
    const draft = entry.draft ? readFileSync(join(DRAFTS_DIR, entry.draft), 'utf8') : undefined;
    await tx.page.create({
      data: {
        id: page.id,
        title: page.title,
        content: draft ?? page.content,
        position,
        spaceId,
        parentId,
        createdById: author,
        updatedById: draft ? author : editor,
        tags: { create: await tagLinks(tx, entry.tags) },
      },
      select: { id: true },
    });
    if (draft) {
      // Mesma edição que a API faz: o trigger guarda o rascunho como versão 1 no histórico
      await tx.page.update({
        where: { id: page.id },
        data: { content: page.content, updatedById: editor, version: { increment: 1 } },
      });
    }
    created += 1 + (await createPages(tx, spaceId, entry.children ?? [], page.id, pages, authors));
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
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock da transação: duas instâncias subindo juntas não fazem o "conta e insere" ao
        // mesmo tempo (a segunda espera e então vê os espaços já criados).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;

        // Sempre, mesmo com conteúdo: num banco antigo a conta demo existe sem o perfil certo.
        // A senha só é definida na criação (quem a trocou não a perde a cada boot).
        const users: Record<string, string> = {};
        for (const { key, password, ...profile } of DEMO_USERS) {
          const { id } = await tx.user.upsert({
            where: { email: profile.email },
            update: { name: profile.name, role: profile.role },
            create: { ...profile, passwordHash: await hash(password, BCRYPT_ROUNDS) },
            select: { id: true },
          });
          users[key] = id;
        }

        if ((await tx.space.count()) > 0) {
          return null;
        }
        const authors: Record<Author, string> = { admin: users.admin, editor: users.editor };
        const documents = loadDocuments();
        const images = await uploadImages(tx, documents, authors.admin);
        const pageIds = new Map([...documents].map(([file, { id }]) => [file, id]));
        const pages = new Map(
          [...documents].map(([file, page]) => {
            const content = rewriteLinks(page.body, file, {
              pages: pageIds,
              images,
              repositoryUrl: REPOSITORY_URL,
            });
            // Acima do limite da API a página não poderia mais ser salva pelo editor
            if (Array.from(content).length > MAX_CONTENT_LENGTH) {
              throw new Error(`${file} passa de ${MAX_CONTENT_LENGTH} caracteres`);
            }
            return [file, { ...page, content }];
          }),
        );

        let created = 0;
        for (const space of SPACES) {
          const { id } = await tx.space.create({
            data: { name: space.name, description: space.description },
            select: { id: true },
          });
          created += await createPages(tx, id, space.pages, null, pages, authors);
        }
        return { pages: created, images: images.size };
      },
      { timeout: 60_000 },
    );
    console.info(
      result === null
        ? 'Seed: espaços já existem, nada a criar.'
        : `Seed: ${SPACES.length} espaços, ${result.pages} páginas e ${result.images} imagens criados a partir de ${DOCS_DIR}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed falhou:', error);
  process.exit(1);
});
