import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // SIGTERM (docker stop) dispara onModuleDestroy → fecha o pool do Prisma
  app.enableShutdownHooks();
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // Os padrões do docker-compose servem só para a avaliação local: avisa se a API subir com eles
  const devSecrets = (['JWT_SECRET', 'INTERNAL_API_SECRET'] as const).filter((name) =>
    config.get(name, { infer: true })?.startsWith('dev-only-'),
  );
  if (devSecrets.length > 0) {
    new Logger('Bootstrap').warn(
      `${devSecrets.join(' e ')} com o valor padrão de desenvolvimento: defina segredos próprios fora do ambiente local`,
    );
  }
  await app.listen(config.get('PORT', { infer: true }));
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    'Falha ao iniciar a API',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
