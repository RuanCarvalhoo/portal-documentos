import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PagesModule } from './pages/pages.module';
import { SearchModule } from './search/search.module';
import { SpacesModule } from './spaces/spaces.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // validate: ambiente inválido derruba o boot em vez de falhar na primeira requisição
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Configuração única do rate limit; cada rota escolhe aplicar com @UseGuards(ThrottlerGuard).
    // Anti força-bruta em login/cadastro: 10 tentativas por minuto por IP e rota.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SpacesModule,
    PagesModule,
    SearchModule,
  ],
})
export class AppModule {}
