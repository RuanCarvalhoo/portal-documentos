import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Único PrismaClient da aplicação (singleton via PrismaModule global):
 * cada instância abre o próprio pool de conexões, então nunca use `new PrismaClient()` nos services.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    // Prisma 7 exige driver adapter; o PrismaPg usa o driver `pg`.
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      // O padrão do `pg` é esperar para sempre; com teto, o /health responde 503 em vez de travar
      connectionTimeoutMillis: 5_000,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
