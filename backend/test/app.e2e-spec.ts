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
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
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

  it('publishes the OpenAPI document with bearer auth', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(res.body.components.securitySchemes.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });
});
