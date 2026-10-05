import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../src/common/client-ip';

const PROXY_SECRET = 'e2e-segredo-do-frontend-0123456789-abcdef';

describe('Rate limit per client (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  // Login com conta inexistente: 401 enquanto houver cota, 429 quando ela acaba
  const login = (headers: Record<string, string>) =>
    http()
      .post('/auth/login')
      .set(headers)
      .send({ email: 'e2e-ninguem@example.com', password: 'senha-errada-1' });
  const viaWebServer = (clientIp: string) => ({
    [CLIENT_IP_HEADER]: clientIp,
    [PROXY_SECRET_HEADER]: PROXY_SECRET,
  });

  beforeAll(async () => {
    process.env.INTERNAL_API_SECRET = PROXY_SECRET;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    delete process.env.INTERNAL_API_SECRET;
    await app?.close();
  });

  it('counts each client forwarded by the web server separately', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await login(viaWebServer('203.0.113.1')).expect(401);
    }
    await login(viaWebServer('203.0.113.1')).expect(429);
    await login(viaWebServer('203.0.113.2')).expect(401);
  });

  it('ignores a forwarded IP without the shared secret, so rotating it does not bypass the limit', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await login({ [CLIENT_IP_HEADER]: `198.51.100.${attempt}` }).expect(401);
    }
    const blocked = await login({ [CLIENT_IP_HEADER]: '198.51.100.99' }).expect(429);
    expect(blocked.body.message).toBe('Muitas tentativas. Aguarde um minuto e tente novamente.');
  });

  it('limits writes to 120 per minute per client', async () => {
    // Sem token cada escrita para no 401 do AuthGuard, mas o rate limit roda antes e conta
    const writes = Array.from({ length: 120 }, () =>
      http().post('/spaces').set(viaWebServer('203.0.113.50')).send({ name: 'E2E nunca criado' }),
    );
    for (const response of await Promise.all(writes)) {
      expect(response.status).toBe(401);
    }
    await http()
      .post('/spaces')
      .set(viaWebServer('203.0.113.50'))
      .send({ name: 'E2E nunca criado' })
      .expect(429);
  });
});
