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
  let spaceId: string;
  let otherSpaceId: string;
  let rootId: string;
  let childId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const user = await http()
      .post('/auth/register')
      .send({ name: 'Pages E2E', email: `e2e-pages-${Date.now()}@example.com`, password: 'senha-forte-1' });
    auth = { Authorization: `Bearer ${user.body.accessToken}` };
    spaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Páginas' })).body.id;
    otherSpaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Outro' })).body.id;
  });

  afterAll(async () => {
    // Espaços primeiro: o cascade leva as páginas, que referenciam o usuário de teste
    await prisma?.space.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-pages-' } } });
    await app?.close();
  });

  it('creates a root page recording its author', async () => {
    const res = await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: 'E2E Raiz', content: '# Olá' })
      .expect(201);

    rootId = res.body.id;
    expect(res.body).toMatchObject({
      parentId: null,
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

  it('saves an edit with the current version and refuses a stale one with 409', async () => {
    const saved = await http()
      .patch(`/pages/${rootId}`)
      .set(auth)
      .send({ content: 'versão 2', version: 1 })
      .expect(200);
    expect(saved.body).toMatchObject({ content: 'versão 2', version: 2 });

    const stale = await http()
      .patch(`/pages/${rootId}`)
      .set(auth)
      .send({ content: 'versão concorrente', version: 1 })
      .expect(409);
    expect(stale.body.message).toContain('alterada por outra pessoa');
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
  });

  it('refuses to move a page under its own child', async () => {
    const res = await http()
      .patch(`/pages/${rootId}`)
      .set(auth)
      .send({ parentId: childId, version: 2 })
      .expect(400);

    expect(res.body.message).toBe(
      'Uma página não pode ser movida para dentro dela mesma ou de uma subpágina',
    );
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
});
