import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('App foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the database as up', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok', database: 'up' });
  });

  it('answers unknown routes with the standard error envelope', async () => {
    const res = await request(app.getHttpServer()).get('/nao-existe').expect(404);

    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found', path: '/nao-existe' });
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('sends security headers and allows only the web origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:3000')
      .expect('x-content-type-options', 'nosniff');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not reflect other origins', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://evil.example')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example');
  });

  it('rejects oversized bodies with 413 in the standard envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ content: 'x'.repeat(200_000) }))
      .expect(413);

    expect(res.body).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'O corpo da requisição é grande demais',
    });
  });

  it('answers a malformed URL and an invalid JSON body in Portuguese', async () => {
    const badParam = await request(app.getHttpServer()).get('/pages/%ZZ').expect(400);
    expect(badParam.body.message).toBe('Parâmetro inválido na URL');

    const badJson = await request(app.getHttpServer())
      .post('/spaces')
      .set('Content-Type', 'application/json')
      .send('{"name":')
      .expect(400);
    expect(badJson.body.message).toBe('O corpo da requisição não é um JSON válido');
  });

  it('sends the API root to the documentation', () => {
    return request(app.getHttpServer()).get('/').expect(302).expect('Location', '/docs');
  });

  it('publishes the OpenAPI document with bearer auth', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(res.body.components.securitySchemes.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });
});
