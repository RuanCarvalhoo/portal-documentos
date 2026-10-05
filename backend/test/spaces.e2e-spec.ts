import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Role } from '../src/auth/roles';
import { PrismaService } from '../src/prisma/prisma.service';
import { registerAs } from './helpers';

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

    // Admin: este teste também exclui espaços, o que Editor não pode
    const admin = await registerAs(app, prisma, Role.ADMIN, {
      name: 'Spaces E2E',
      email: `e2e-spaces-${Date.now()}@example.com`,
    });
    auth = admin.auth;
    userId = admin.user.id;
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

    expect(created.body.version).toBe(1);
    const updated = await request(app.getHttpServer())
      .patch(`/spaces/${id}`)
      .set(auth)
      .send({ name: 'E2E Espaço renomeado', version: 1 })
      .expect(200);
    expect(updated.body).toMatchObject({ name: 'E2E Espaço renomeado', version: 2 });

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

    const empty = await request(app.getHttpServer()).patch(url).set(auth).send({ version: 1 }).expect(400);
    expect(empty.body.message).toBe('Informe ao menos um campo para atualizar');
    await request(app.getHttpServer()).patch(url).set(auth).send({ name: null, version: 1 }).expect(400);
    const cleared = await request(app.getHttpServer())
      .patch(url)
      .set(auth)
      .send({ description: null, version: 1 })
      .expect(200);
    expect(cleared.body.description).toBeNull();
  });

  describe('concurrent edits', () => {
    const createSpace = async (name: string): Promise<{ url: string; version: number }> => {
      const res = await request(app.getHttpServer()).post('/spaces').set(auth).send({ name }).expect(201);
      return { url: `/spaces/${res.body.id}`, version: res.body.version };
    };

    it('requires the version the client read', async () => {
      const { url } = await createSpace('E2E Sem versão');

      const res = await request(app.getHttpServer()).patch(url).set(auth).send({ name: 'x' }).expect(400);

      expect(res.body.message).toContain('version deve ser um número inteiro');
      await request(app.getHttpServer()).patch(url).set(auth).send({ name: 'x', version: 0 }).expect(400);
    });

    it('refuses a save over a version someone else already replaced', async () => {
      const { url, version } = await createSpace('E2E Conflito');
      await request(app.getHttpServer())
        .patch(url)
        .set(auth)
        .send({ description: 'Primeira edição', version })
        .expect(200);

      const stale = await request(app.getHttpServer())
        .patch(url)
        .set(auth)
        .send({ name: 'E2E Segunda edição', version })
        .expect(409);

      expect(stale.body.message).toBe(
        'Este espaço foi alterado por outra pessoa. Recarregue para ver a versão atual.',
      );
      const current = await request(app.getHttpServer()).get(url).expect(200);
      expect(current.body).toMatchObject({
        name: 'E2E Conflito',
        description: 'Primeira edição',
        version: 2,
      });
    });

    it('lets only one of two simultaneous saves of the same version win', async () => {
      const { url, version } = await createSpace('E2E Simultâneo');
      const save = (name: string) =>
        request(app.getHttpServer()).patch(url).set(auth).send({ name, version });

      const results = await Promise.all([save('E2E Simultâneo A'), save('E2E Simultâneo B')]);

      expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
    });

    it('keeps the version when a save changes nothing, so a concurrent editor gets no 409', async () => {
      const { url, version } = await createSpace('E2E Intacto');

      const same = await request(app.getHttpServer())
        .patch(url)
        .set(auth)
        .send({ name: 'E2E Intacto', description: null, version })
        .expect(200);

      expect(same.body.version).toBe(version);
      await request(app.getHttpServer())
        .patch(url)
        .set(auth)
        .send({ name: 'E2E Editado', version })
        .expect(200);
    });
  });

  it('answers 404 when an authenticated user edits or deletes a missing space', async () => {
    await request(app.getHttpServer())
      .patch(`/spaces/${MISSING_ID}`)
      .set(auth)
      .send({ name: 'x', version: 1 })
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
    await request(app.getHttpServer())
      .patch(`/spaces/${MISSING_ID}`)
      .send({ name: 'x', version: 1 })
      .expect(401);
    await request(app.getHttpServer()).delete(`/spaces/${MISSING_ID}`).expect(401);
  });
});
