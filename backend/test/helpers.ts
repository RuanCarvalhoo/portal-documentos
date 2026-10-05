import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Role } from '../src/auth/roles';
import type { PrismaService } from '../src/prisma/prisma.service';

export const PASSWORD = 'senha-forte-1';

/**
 * Cadastra uma conta pela API (ela entra como Leitor) e ajusta o perfil direto no banco: o
 * AuthGuard lê o perfil a cada requisição, então o token já emitido passa a valer com ele.
 */
export async function registerAs(
  app: INestApplication<App>,
  prisma: PrismaService,
  role: Role,
  { name, email }: { name: string; email: string },
): Promise<{ auth: { Authorization: string }; user: { id: string; name: string; email: string } }> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name, email, password: PASSWORD })
    .expect(201);
  if (role !== Role.READER) {
    await prisma.user.update({ where: { id: res.body.user.id }, data: { role } });
  }
  return { auth: { Authorization: `Bearer ${res.body.accessToken}` }, user: res.body.user };
}
