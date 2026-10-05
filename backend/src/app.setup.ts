import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

/**
 * Configuração HTTP compartilhada por main.ts e pelos testes e2e: os testes exercitam
 * exatamente os mesmos headers, CORS, validação, filtro de erros e Swagger da aplicação real.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN') });
  app.useGlobalPipes(
    // whitelist + forbidNonWhitelisted: campo fora do DTO vira 400 (sem mass assignment)
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Portal de Documentação')
      .setDescription('API do portal: espaços, páginas em Markdown, busca e autenticação JWT.')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);

  // A raiz da API não é um recurso: quem abre http://localhost:3001 cai na documentação
  const http = app.getHttpAdapter();
  http.get('/', (_request: unknown, response: unknown) => http.redirect(response, 302, '/docs'));
}
