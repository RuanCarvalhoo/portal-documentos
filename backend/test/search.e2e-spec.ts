import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

// Palavra inventada: só as páginas criadas por este teste a contêm
const WORD = 'zebrafuscado';

describe('Search (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const user = await http()
      .post('/auth/register')
      .send({ name: 'Search E2E', email: `e2e-search-${Date.now()}@example.com`, password: 'senha-forte-1' });
    const auth = { Authorization: `Bearer ${user.body.accessToken}` };
    const spaceId = (await http().post('/spaces').set(auth).send({ name: 'E2E Busca' })).body.id;
    await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: `Título com ${WORD}`, content: 'Sem a palavra no conteúdo.' });
    await http()
      .post(`/spaces/${spaceId}/pages`)
      .set(auth)
      .send({ title: 'E2E Outra', content: `Introdução longa. O termo ${WORD.toUpperCase()} aparece no meio.` });
  });

  afterAll(async () => {
    await prisma?.space.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-search-' } } });
    await app?.close();
  });

  it('finds pages by title and by content, ignoring case', async () => {
    const res = await http().get(`/search?q=${WORD}`).expect(200);

    expect(res.body.meta).toEqual({ total: 2, page: 1, limit: 20 });
    expect(res.body.data.map((hit: { title: string }) => hit.title).sort()).toEqual([
      'E2E Outra',
      `Título com ${WORD}`,
    ]);
    const contentHit = res.body.data.find((hit: { title: string }) => hit.title === 'E2E Outra');
    expect(contentHit).toMatchObject({ spaceName: 'E2E Busca' });
    expect(contentHit.snippet).toContain(WORD.toUpperCase());
  });

  it('paginates the results', async () => {
    const res = await http().get(`/search?q=${WORD}&limit=1&page=2`).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ total: 2, page: 2, limit: 1 });
  });

  it('returns an empty page when nothing matches', async () => {
    const res = await http().get('/search?q=termo-que-nao-existe-em-lugar-algum').expect(200);

    expect(res.body).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20 } });
  });

  it('requires a term of at least 3 characters', async () => {
    await http().get('/search').expect(400);
    const short = await http().get('/search?q=%20ab%20').expect(400);

    expect(short.body.message).toContain('Use pelo menos 3 caracteres na busca');
  });
});
