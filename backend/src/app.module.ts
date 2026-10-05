import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { clientIpOf } from './common/client-ip';
import { loggerParams } from './common/logging';
import { PagesModule } from './pages/pages.module';
import { SearchModule } from './search/search.module';
import { SpacesModule } from './spaces/spaces.module';
import { TagsModule } from './tags/tags.module';
import { type Env, validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // validate: ambiente inválido derruba o boot em vez de falhar na primeira requisição
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Logs estruturados em JSON com id de requisição (ADR 009)
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        loggerParams({
          LOG_LEVEL: config.get('LOG_LEVEL', { infer: true }),
          LOG_PRETTY: config.get('LOG_PRETTY', { infer: true }),
          INTERNAL_API_SECRET: config.get('INTERNAL_API_SECRET', { infer: true }),
        }),
    }),
    // Configuração única do rate limit; cada rota escolhe aplicar com @UseGuards(ThrottlerGuard).
    // Padrão anti força-bruta em login/cadastro: 10 tentativas por minuto por cliente e rota.
    // Cliente = IP da conexão, ou o IP repassado pelo frontend com o segredo compartilhado.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 10 }],
        errorMessage: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        // O throttler entrega a requisição como Record; na plataforma Express ela é a Request
        getTracker: (request) => clientIpOf(request as Request, config.get<string>('INTERNAL_API_SECRET')),
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SpacesModule,
    PagesModule,
    SearchModule,
    TagsModule,
    UsersModule,
  ],
})
export class AppModule {}
