import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limit das escritas (criar, editar, excluir): folgado para uma pessoa, mas freia um script
 * que cria ou apaga conteúdo em massa com uma conta recém-criada (o cadastro é aberto).
 */
export const WriteThrottle = () =>
  applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({ default: { limit: 120, ttl: 60_000 } }),
    ApiTooManyRequestsResponse({ description: 'Muitas alterações em pouco tempo' }),
  );
