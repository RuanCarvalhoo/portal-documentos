import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard, MIN_ROLE_KEY } from './auth.guard';
import { ROLE_LABELS, type Role } from './roles';

/**
 * Rota autenticada, opcionalmente com perfil mínimo: `@Auth()` exige só login,
 * `@Auth(Role.EDITOR)` exige Editor ou Admin. Declara também o Bearer e as respostas no Swagger.
 *
 * Fica acima de `@WriteThrottle()` (decorators aplicam de baixo para cima): o rate limit conta a
 * tentativa antes de o AuthGuard recusá-la.
 */
export const Auth = (minimum?: Role) =>
  applyDecorators(
    SetMetadata(MIN_ROLE_KEY, minimum),
    UseGuards(AuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' }),
    ...(minimum
      ? [ApiForbiddenResponse({ description: `Exige o perfil ${ROLE_LABELS[minimum]} ou superior` })]
      : []),
  );
