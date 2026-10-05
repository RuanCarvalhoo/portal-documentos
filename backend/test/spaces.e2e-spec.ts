import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const MISSING_ID = '00000000-0000-7000-8000-000000000000';

describe('Spaces (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: { Authorization: string };
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Spaces E2E', email: `e2e-spaces-${Date.now()}@example.com`, password: 'senha-forte-1' });
    auth = { Authorization: `Bearer ${res.body.accessToken}` };
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await prisma?.space.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-spaces-' } } });
    await app?.close();
  });

  it('lists spaces publicly with pagination metadata', async () => {
    const res = await request(app.getHttpServer()).get('/spaces?page=1&limit=2').expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta).toEqual({ total: expect.any(Number), page: 1, limit: 2 });
  });

  it('uses page 1 and limit 20 by default', async () => {
    const res = await request(app.getHttpServer()).get('/spaces').expect(200);

    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
  });

  it.each(['limit=51', 'limit=0', 'page=0', 'page=abc', 'page=1e19', 'page=1&page=2'])(
    'rejects invalid pagination %s',
    (query) => {
      return request(app.getHttpServer()).get(`/spaces?${query}`).expect(400);
    },
  );

  it('answers 400 for a malformed id and 404 for a missing one', async () => {
    await request(app.getHttpServer()).get('/spaces/nao-e-uuid').expect(400);
    const res = await request(app.getHttpServer()).get(`/spaces/${MISSING_ID}`).expect(404);

    expect(res.body.message).toBe('Espaço não encontrado');
  });

  it('requires a token to create a space', () => {
    return request(app.getHttpServer()).post('/spaces').send({ name: 'E2E Sem token' }).expect(401);
  });

  it('validates the body of a new space', async () => {
    const res = await request(app.getHttpServer())
      .post('/spaces')
      .set(auth)
      .send({ name: '  ', extra: true })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining(['Campo não permitido: extra', 'Informe o nome do espaço']),
    );
  });

  it('answers 400 (not 500) for a NUL byte, which postgres does not store in text', async () => {
    const res = await request(app.getHttpServer())
      .post('/spaces')
      .set(auth)
      .send({ name: 'E2E com \u0000 nulo' })
      .expect(400);

    expect(res.body.message).toBe('O texto contém um caractere inválido (byte nulo)');
  });

  it('creates, reads, updates and deletes a space', async () => {
    const created = await request(app.getHttpServer())
      .post('/spaces')
      .set(auth)
      .send({ name: ' E2E Espaço ', description: 'Criado no teste' })
      .expect(201);
    const id: string = created.body.id;
    expect(created.body).toMatchObject({ name: 'E2E Espaço', description: 'Criado no teste' });

    await request(app.getHttpServer()).get(`/spaces/${id}`).expect(200);

    const updated = await request(app.getHttpServer())
      .patch(`/spaces/${id}`)
      .set(auth)
      .send({ name: 'E2E Espaço renomeado' })
      .expect(200);
    expect(updated.body.name).toBe('E2E Espaço renomeado');

    await request(app.getHttpServer()).delete(`/spaces/${id}`).set(auth).expect(204);
    await request(app.getHttpServer()).get(`/spaces/${id}`).expect(404);
  });

  it('rejects an empty patch or a null name, but lets description be cleared', async () => {
    const created = await request(app.getHttpServer())
      .post('/spaces')
      .set(auth)
      .send({ name: 'E2E Patch', description: 'Temporária' })
      .expect(201);
    const url = `/spaces/${created.body.id}`;

    const empty = await request(app.getHttpServer()).patch(url).set(auth).send({}).expect(400);
    expect(empty.body.message).toBe('Informe ao menos um campo para atualizar');
    await request(app.getHttpServer()).patch(url).set(auth).send({ name: null }).expect(400);
    const cleared = await request(app.getHttpServer())
      .patch(url)
      .set(auth)
      .send({ description: null })
      .expect(200);
    expect(cleared.body.description).toBeNull();
  });

  it('answers 404 when an authenticated user edits or deletes a missing space', async () => {
    await request(app.getHttpServer())
      .patch(`/spaces/${MISSING_ID}`)
      .set(auth)
      .send({ name: 'x' })
      .expect(404);
    await request(app.getHttpServer()).delete(`/spaces/${MISSING_ID}`).set(auth).expect(404);
  });

  it('deleting a space also deletes its pages', async () => {
    const created = await request(app.getHttpServer())
      .post('/spaces')
      .set(auth)
      .send({ name: 'E2E Cascata' })
      .expect(201);
    const page = await prisma.page.create({
      data: { title: 'E2E Página', spaceId: created.body.id, createdById: userId, updatedById: userId },
    });

    await request(app.getHttpServer()).delete(`/spaces/${created.body.id}`).set(auth).expect(204);

    expect(await prisma.page.count({ where: { id: page.id } })).toBe(0);
  });

  it('requires a token to update or delete', async () => {
    await request(app.getHttpServer()).patch(`/spaces/${MISSING_ID}`).send({ name: 'x' }).expect(401);
    await request(app.getHttpServer()).delete(`/spaces/${MISSING_ID}`).expect(401);
  });
});
