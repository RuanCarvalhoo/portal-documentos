import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'senha-forte-1';
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // ?. : se o setup falhar, o erro original aparece em vez de um TypeError aqui
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
    await app?.close();
  });

  it('registers a user with a normalized e-mail and returns a token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Pessoa E2E', email: `  ${email.toUpperCase()} `, password })
      .expect(201);

    expect(res.body.user).toEqual({ id: expect.any(String), name: 'Pessoa E2E', email });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('rejects a duplicate e-mail with 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Outra Pessoa', email, password })
      .expect(409);

    expect(res.body.message).toBe('E-mail já cadastrado');
  });

  it('validates the body with readable messages and rejects unknown fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: '   ', email: 'invalido', password: '123', role: 'admin' })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Campo não permitido: role',
        'O nome deve ter entre 2 e 80 caracteres',
        'Informe um e-mail válido',
        'A senha deve ter pelo menos 8 caracteres',
      ]),
    );
  });

  it('rejects an e-mail that is not a string', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ['a@example.com'], password })
      .expect(400);

    expect(res.body.message).toContain('Informe um e-mail válido');
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);

    token = res.body.accessToken;
    expect(res.body.user.email).toBe(email);
  });

  it('answers 401 with the same generic message for a wrong password or unknown e-mail', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'senha-errada' })
      .expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ninguem@example.com', password })
      .expect(401);

    expect(wrongPassword.body.message).toBe('Credenciais inválidas');
    expect(unknownEmail.body.message).toBe('Credenciais inválidas');
  });

  it('GET /auth/me requires a token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me returns the profile of the token owner', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ id: expect.any(String), name: 'Pessoa E2E', email });
  });

  it('throttles repeated login attempts with 429', async () => {
    let status = 0;
    for (let attempt = 0; attempt < 15 && status !== 429; attempt++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'senha-errada' });
      status = res.status;
    }

    expect(status).toBe(429);
  });
});
