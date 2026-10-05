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

describe('Roles and users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  type Account = Awaited<ReturnType<typeof registerAs>>;
  let admin: Account;
  let editor: Account;
  let reader: Account;
  const http = () => request(app.getHttpServer());
  const email = (who: string) => `e2e-roles-${who}-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    admin = await registerAs(app, prisma, Role.ADMIN, { name: 'Admin E2E', email: email('admin') });
    editor = await registerAs(app, prisma, Role.EDITOR, { name: 'Editor E2E', email: email('editor') });
    reader = await registerAs(app, prisma, Role.READER, { name: 'Leitor E2E', email: email('reader') });
  });

  afterAll(async () => {
    await prisma?.space.deleteMany({ where: { name: { startsWith: 'E2E ' } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-roles-' } } });
    await app?.close();
  });

  it('lets a reader read but answers 403 to any write', async () => {
    await http().get('/spaces').set(reader.auth).expect(200);
    const res = await http().post('/spaces').set(reader.auth).send({ name: 'E2E Leitor' }).expect(403);
    expect(res.body.message).toBe('Seu perfil não permite esta ação');
  });

  it('lets an editor write but only an admin delete a space', async () => {
    const space = await http().post('/spaces').set(editor.auth).send({ name: 'E2E Editor' }).expect(201);
    await http()
      .patch(`/spaces/${space.body.id}`)
      .set(editor.auth)
      .send({ name: 'E2E Editado', version: space.body.version })
      .expect(200);
    await http().delete(`/spaces/${space.body.id}`).set(editor.auth).expect(403);
    await http().delete(`/spaces/${space.body.id}`).set(admin.auth).expect(204);
  });

  it('keeps the user list and role changes for admins only', async () => {
    await http().get('/users').expect(401);
    await http().get('/users').set(editor.auth).expect(403);
    // Leitor tentando se promover
    await http().patch(`/users/${reader.user.id}/role`).set(reader.auth).send({ role: 'ADMIN' }).expect(403);
  });

  it('lists the accounts with their roles and never the password hash', async () => {
    const res = await http().get('/users?limit=50').set(admin.auth).expect(200);

    expect(res.body.meta).toEqual({ total: expect.any(Number), page: 1, limit: 50 });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    const total = res.body.meta.total;
    const last = await http().get(`/users?limit=1&page=${total}`).set(admin.auth).expect(200);
    expect(last.body.data[0]).toMatchObject({ id: reader.user.id, role: 'READER' });
  });

  it('applies a promotion immediately, with the token the account already has', async () => {
    const res = await http()
      .patch(`/users/${reader.user.id}/role`)
      .set(admin.auth)
      .send({ role: 'EDITOR' })
      .expect(200);
    expect(res.body).toMatchObject({ id: reader.user.id, role: 'EDITOR' });

    await http().post('/spaces').set(reader.auth).send({ name: 'E2E Promovido' }).expect(201);
    expect((await http().get('/auth/me').set(reader.auth).expect(200)).body.role).toBe('EDITOR');
  });

  it('validates the role and the account', async () => {
    const invalid = await http()
      .patch(`/users/${reader.user.id}/role`)
      .set(admin.auth)
      .send({ role: 'OWNER' })
      .expect(400);
    expect(invalid.body.message).toContain('Perfil inválido: use ADMIN, EDITOR ou READER');

    await http().patch(`/users/${MISSING_ID}/role`).set(admin.auth).send({ role: 'EDITOR' }).expect(404);
  });

  it('never demotes the last admin', async () => {
    // Isola este admin como o único do banco (o seed cria outro) e devolve os demais no fim
    const others = await prisma.user.findMany({
      where: { role: Role.ADMIN, id: { not: admin.user.id } },
      select: { id: true },
    });
    const ids = others.map(({ id }) => id);
    await prisma.user.updateMany({ where: { id: { in: ids } }, data: { role: Role.EDITOR } });
    try {
      const res = await http()
        .patch(`/users/${admin.user.id}/role`)
        .set(admin.auth)
        .send({ role: 'READER' })
        .expect(409);
      expect(res.body.message).toMatch(/única conta Admin/);
    } finally {
      await prisma.user.updateMany({ where: { id: { in: ids } }, data: { role: Role.ADMIN } });
    }
  });

  it('rejects the token of an account that no longer exists', async () => {
    const gone = await registerAs(app, prisma, Role.EDITOR, { name: 'Removida E2E', email: email('gone') });
    await prisma.user.delete({ where: { id: gone.user.id } });

    await http().get('/auth/me').set(gone.auth).expect(401);
  });
});
