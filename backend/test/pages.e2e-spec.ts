import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const MISSING_ID = '00000000-0000-7000-8000-000000000000';

describe('Pages (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  let editorAuth: { Authorization: string };
  let spaceId: string;
  let otherSpaceId: string;
  let rootId: string;
  let childId: string;

  const http = () => request(app.getHttpServer());
  const register = async (name: string) => {
    const res = await http()
      .post('/auth/register')
      .send({ name, email: `e2e-pages-${name.length}-${Date.now()}@example.com`, password: 'senha-forte-1' });
    return { Authorization: `Bearer ${res.body.accessToken}` };
  };
  const versionOf = async (id: string): Promise<number> =>
    (await http().get(`/pages/${id}`).expect(200)).body.version;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    auth = await register('Pages E2E');
    editorAuth = await register('Outra Editora E2E');
    spaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Páginas' })).body.id;
    otherSpaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Outro' })).body.id;
  });

  afterAll(async () => {
    // Espaços primeiro: o cascade leva as páginas, que referenciam os usuários de teste
    await prisma?.space.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-pages-' } } });
    await app?.close();
  });

  describe('creation and reading', () => {
    it('creates a root page recording its author', async () => {
      const res = await http()
        .post(`/spaces/${spaceId}/pages`)
        .set(auth)
        .send({ title: 'E2E Raiz', content: '# Olá' })
        .expect(201);

      rootId = res.body.id;
      expect(res.body).toMatchObject({
        parentId: null,
        position: 0,
        version: 1,
        createdBy: { name: 'Pages E2E' },
        updatedBy: { name: 'Pages E2E' },
      });
    });

    it('creates a child page under the root', async () => {
      const res = await http()
        .post(`/spaces/${spaceId}/pages`)
        .set(auth)
        .send({ title: 'E2E Filha', parentId: rootId })
        .expect(201);

      childId = res.body.id;
      expect(res.body).toMatchObject({ parentId: rootId, content: '' });
    });

    it('rejects a parent page from another space and a missing space', async () => {
      const res = await http()
        .post(`/spaces/${otherSpaceId}/pages`)
        .set(auth)
        .send({ title: 'E2E Intrusa', parentId: rootId })
        .expect(400);
      expect(res.body.message).toBe('A página pai deve existir e estar no mesmo espaço');

      await http().post(`/spaces/${MISSING_ID}/pages`).set(auth).send({ title: 'E2E x' }).expect(404);
    });

    it('reads a page publicly with its content and authorship', async () => {
      const res = await http().get(`/pages/${rootId}`).expect(200);

      expect(res.body).toMatchObject({ title: 'E2E Raiz', content: '# Olá', spaceId });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });
  });

  describe('editing', () => {
    it('saves with the current version, records the editor and refuses a stale version', async () => {
      const saved = await http()
        .patch(`/pages/${rootId}`)
        .set(editorAuth)
        .send({ content: 'versão 2', version: 1 })
        .expect(200);
      expect(saved.body).toMatchObject({
        content: 'versão 2',
        version: 2,
        createdBy: { name: 'Pages E2E' },
        updatedBy: { name: 'Outra Editora E2E' },
      });

      const stale = await http()
        .patch(`/pages/${rootId}`)
        .set(auth)
        .send({ content: 'versão concorrente', version: 1 })
        .expect(409);
      expect(stale.body.message).toContain('alterada por outra pessoa');
    });

    it('lets only one of two simultaneous saves of the same version win', async () => {
      const version = await versionOf(rootId);
      const save = (content: string) => http().patch(`/pages/${rootId}`).set(auth).send({ content, version });

      const statuses = (await Promise.all([save('A'), save('B')])).map((res) => res.status);

      expect(statuses.sort()).toEqual([200, 409]);
    });

    it('validates the edit body', async () => {
      const res = await http()
        .patch(`/pages/${rootId}`)
        .set(auth)
        .send({ title: 'Sem versão', content: null })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'version deve ser um número inteiro',
          'O conteúdo deve ser um texto em Markdown',
        ]),
      );

      await http().patch(`/pages/${rootId}`).set(auth).send({ version: 1 }).expect(400);
      await http().patch(`/pages/${rootId}`).set(auth).send({ title: 'x', version: 0 }).expect(400);
      await http()
        .patch(`/pages/${rootId}`)
        .set(auth)
        .send({ title: 'x', version: 9_999_999_999 })
        .expect(400);
    });

    it('refuses to move a page under its own child or under a page of another space', async () => {
      // Versão lida antes: supertest não suporta outra requisição no meio da montagem desta
      const rootVersion = await versionOf(rootId);
      const cycle = await http()
        .patch(`/pages/${rootId}`)
        .set(auth)
        .send({ parentId: childId, version: rootVersion })
        .expect(400);
      expect(cycle.body.message).toBe(
        'Uma página não pode ser movida para dentro dela mesma ou de uma subpágina',
      );

      const foreign = (
        await http().post(`/spaces/${otherSpaceId}/pages`).set(auth).send({ title: 'E2E Alheia' })
      ).body.id;
      const childVersion = await versionOf(childId);
      await http()
        .patch(`/pages/${childId}`)
        .set(auth)
        .send({ parentId: foreign, version: childVersion })
        .expect(400);
    });

    it('moves a page to the root, after the existing root pages, and back', async () => {
      const version = await versionOf(childId);
      const toRoot = await http()
        .patch(`/pages/${childId}`)
        .set(auth)
        .send({ parentId: null, version })
        .expect(200);
      expect(toRoot.body).toMatchObject({ parentId: null, position: 1 });

      const back = await http()
        .patch(`/pages/${childId}`)
        .set(auth)
        .send({ parentId: rootId, version: toRoot.body.version })
        .expect(200);
      expect(back.body.parentId).toBe(rootId);
    });

    it('answers 404 when editing or deleting a missing page', async () => {
      await http().patch(`/pages/${MISSING_ID}`).set(auth).send({ title: 'x', version: 1 }).expect(404);
      await http().delete(`/pages/${MISSING_ID}`).set(auth).expect(404);
    });
  });

  it('lists every space with its page tree in /navigation, without content', async () => {
    const res = await http().get('/navigation').expect(200);
    const space = res.body.find((item: { id: string }) => item.id === spaceId);

    expect(space).toEqual({
      id: spaceId,
      name: 'E2E Páginas',
      pages: [
        {
          id: rootId,
          title: 'E2E Raiz',
          children: [{ id: childId, title: 'E2E Filha', children: [] }],
        },
      ],
    });
  });

  it('requires a token for every write', async () => {
    await http().post(`/spaces/${spaceId}/pages`).send({ title: 'x' }).expect(401);
    await http().patch(`/pages/${rootId}`).send({ title: 'x', version: 2 }).expect(401);
    await http().delete(`/pages/${rootId}`).expect(401);
  });

  it('answers 400 for a malformed id and 404 for a missing page', async () => {
    await http().get('/pages/nao-e-uuid').expect(400);
    await http().get(`/pages/${MISSING_ID}`).expect(404);
  });

  it('deleting a page also deletes its subpages', async () => {
    await http().delete(`/pages/${rootId}`).set(auth).expect(204);

    await http().get(`/pages/${childId}`).expect(404);
  });

  it('keeps the version when a save changes nothing, so a concurrent editor gets no 409', async () => {
    const ownSpaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Sem mudança' })).body.id;
    const page = (
      await http()
        .post(`/spaces/${ownSpaceId}/pages`)
        .set(auth)
        .send({ title: 'E2E Intacta', content: 'Texto' })
        .expect(201)
    ).body;

    const same = await http()
      .patch(`/pages/${page.id}`)
      .set(editorAuth)
      .send({ title: 'E2E Intacta', content: 'Texto', version: page.version })
      .expect(200);
    expect(same.body.version).toBe(page.version);
    expect(same.body.updatedBy.id).toBe(page.updatedBy.id);

    const edited = await http()
      .patch(`/pages/${page.id}`)
      .set(auth)
      .send({ content: 'Texto novo', version: page.version })
      .expect(200);
    expect(edited.body.version).toBe(page.version + 1);
  });

  it('keeps the previous text of a page as a version on every edit of title or content', async () => {
    const ownSpaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Histórico' })).body.id;
    const page = (
      await http()
        .post(`/spaces/${ownSpaceId}/pages`)
        .set(auth)
        .send({ title: 'E2E Versionada', content: 'Primeiro texto' })
        .expect(201)
    ).body;
    const other = (
      await http().post(`/spaces/${ownSpaceId}/pages`).set(auth).send({ title: 'E2E Outra raiz' }).expect(201)
    ).body;

    const edited = (
      await http()
        .patch(`/pages/${page.id}`)
        .set(editorAuth)
        .send({ content: 'Segundo texto', version: page.version })
        .expect(200)
    ).body;
    // Mover sem editar o texto não gera versão
    await http()
      .patch(`/pages/${page.id}`)
      .set(auth)
      .send({ parentId: other.id, version: edited.version })
      .expect(200);

    const list = await http().get(`/pages/${page.id}/versions`).expect(200);
    expect(list.body.meta).toMatchObject({ total: 1, page: 1 });
    expect(list.body.data).toEqual([
      {
        version: 1,
        title: 'E2E Versionada',
        editedBy: { id: page.createdBy.id, name: page.createdBy.name },
        editedAt: page.updatedAt,
      },
    ]);
    expect(list.body.data[0]).not.toHaveProperty('content');

    const first = await http().get(`/pages/${page.id}/versions/1`).expect(200);
    expect(first.body).toMatchObject({ pageId: page.id, version: 1, content: 'Primeiro texto' });

    await http().get(`/pages/${page.id}/versions/2`).expect(404);
    await http().get(`/pages/${page.id}/versions/abc`).expect(400);
    await http().get(`/pages/${MISSING_ID}/versions`).expect(404);

    await http().delete(`/pages/${page.id}`).set(auth).expect(204);
    await http().get(`/pages/${page.id}/versions/1`).expect(404);
  });

  it('applies the tree rules to ids sent in upper case too', async () => {
    const ownSpaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Maiúsculas' })).body.id;
    const createPage = (title: string, parentId?: string) =>
      http().post(`/spaces/${ownSpaceId}/pages`).set(auth).send({ title, parentId });
    const root = (await createPage('E2E Raiz').expect(201)).body;
    // O Postgres aceita uuid em qualquer caixa; a API também, e normaliza para comparar
    const child = (await createPage('E2E Filha', root.id.toUpperCase()).expect(201)).body;
    expect(child.parentId).toBe(root.id);

    const cycle = await http()
      .patch(`/pages/${root.id.toUpperCase()}`)
      .set(auth)
      .send({ parentId: child.id.toUpperCase(), version: root.version })
      .expect(400);
    expect(cycle.body.message).toBe(
      'Uma página não pode ser movida para dentro dela mesma ou de uma subpágina',
    );
  });

  it('limits the page tree to 10 levels, on create and on move', async () => {
    const deepSpaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Profundidade' })).body.id;
    const createPage = (title: string, parentId?: string) =>
      http().post(`/spaces/${deepSpaceId}/pages`).set(auth).send({ title, parentId });
    const levels: string[] = [];
    for (let level = 1; level <= 10; level += 1) {
      levels.push((await createPage(`E2E Nível ${level}`, levels.at(-1)).expect(201)).body.id);
    }

    const tooDeep = await createPage('E2E Nível 11', levels.at(-1)).expect(400);
    expect(tooDeep.body.message).toBe('A hierarquia de páginas pode ter no máximo 10 níveis');

    // Uma raiz com uma filha ocupa 2 níveis: cabe sob o nível 8, não sob o 9
    const movedRoot = (await createPage('E2E Raiz movida').expect(201)).body;
    await createPage('E2E Filha da raiz movida', movedRoot.id).expect(201);
    await http()
      .patch(`/pages/${movedRoot.id}`)
      .set(auth)
      .send({ parentId: levels[8], version: movedRoot.version })
      .expect(400);
    await http()
      .patch(`/pages/${movedRoot.id}`)
      .set(auth)
      .send({ parentId: levels[7], version: movedRoot.version })
      .expect(200);
  });
});
