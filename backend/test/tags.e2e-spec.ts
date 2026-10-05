import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Role } from '../src/auth/roles';
import { PrismaService } from '../src/prisma/prisma.service';
import { registerAs } from './helpers';

// Prefixo curto (tags têm até 30 caracteres) e inventado: só as tags deste teste o usam
const TAG = `e2e${Date.now() % 1_000_000}`;

describe('Tags (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  let spaceId: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    ({ auth } = await registerAs(app, prisma, Role.EDITOR, {
      name: 'Tags E2E',
      email: `e2e-tags-${Date.now()}@example.com`,
    }));
    spaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Tags' })).body.id;
  });

  afterAll(async () => {
    await prisma?.space.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma?.tag.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-tags-' } } });
    await app?.close();
  });

  it('normalizes, deduplicates and sorts the tags of a new page', async () => {
    const res = await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: 'E2E Com tags', tags: [`  ${TAG} Banco de Dados `, `${TAG}_API`, `${TAG}-api`] })
      .expect(201);

    expect(res.body.tags).toEqual([`${TAG}-api`, `${TAG}-banco-de-dados`]);
    expect((await http().get(`/pages/${res.body.id}`).expect(200)).body.tags).toEqual(res.body.tags);
  });

  it('validates the tags with readable messages', async () => {
    const invalid = await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: 'E2E Inválida', tags: ['#ruim'] })
      .expect(400);
    expect(invalid.body.message).toContain('Tags usam só letras, números e hífens (ex.: banco-de-dados)');

    const many = await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: 'E2E Muitas', tags: Array.from({ length: 11 }, (_, i) => `${TAG}-${i}`) })
      .expect(400);
    expect(many.body.message).toContain('Use no máximo 10 tags por página');

    await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: 'E2E Texto', tags: 'api' })
      .expect(400);
  });

  it('replaces the tags as metadata: new version number, same author, no history entry', async () => {
    const page = (
      await http()
        .post(`/spaces/${spaceId}/pages`)
        .set(auth)
        .send({ title: 'E2E Metadado', content: 'Texto', tags: [`${TAG}-velha`] })
        .expect(201)
    ).body;

    const res = await http()
      .patch(`/pages/${page.id}`)
      .set(auth)
      .send({ tags: [`${TAG}-nova`], version: page.version })
      .expect(200);

    expect(res.body).toMatchObject({
      tags: [`${TAG}-nova`],
      version: page.version + 1,
      updatedAt: page.updatedAt,
    });
    expect((await http().get(`/pages/${page.id}/versions`).expect(200)).body.meta.total).toBe(0);
    // Mesmas tags em outra ordem: nada muda, nem a versão
    const same = await http()
      .patch(`/pages/${page.id}`)
      .set(auth)
      .send({ tags: [`${TAG}-nova`], version: page.version })
      .expect(200);
    expect(same.body.version).toBe(page.version + 1);
  });

  it('lists the tags in use with their page count', async () => {
    const res = await http().get('/tags?limit=50').expect(200);
    const ours = res.body.data.filter(({ name }: { name: string }) => name.startsWith(TAG));

    expect(ours).toEqual(
      expect.arrayContaining([
        { name: `${TAG}-api`, pageCount: 1 },
        { name: `${TAG}-nova`, pageCount: 1 },
      ]),
    );
    // A tag trocada saiu da página e, sem páginas, sai da lista
    expect(ours.map(({ name }: { name: string }) => name)).not.toContain(`${TAG}-velha`);
  });

  it('lists the pages of a tag, accepting the tag as typed', async () => {
    const res = await http()
      .get(`/tags/${encodeURIComponent(`${TAG} API`)}/pages`)
      .expect(200);

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({
      title: 'E2E Com tags',
      spaceId,
      spaceName: 'E2E Tags',
      tags: [`${TAG}-api`, `${TAG}-banco-de-dados`],
    });
  });

  it('answers 404 for a tag without pages and 400 for an invalid one', async () => {
    await http().get(`/tags/${TAG}-ninguem/pages`).expect(404);
    const invalid = await http().get('/tags/%23%23/pages').expect(400);
    expect(invalid.body.message).toBe('Tag inválida');
  });
});
