import { applyDecorators } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';

// version é int4 no Postgres: acima disso a query falharia com erro 500
export const MAX_VERSION = 2_147_483_647;

/** Versão lida pelo cliente no PATCH de páginas e espaços (concorrência otimista, ADR 005). */
export const VersionRules = (): PropertyDecorator =>
  applyDecorators(
    IsInt({ message: 'version deve ser um número inteiro' }),
    Min(1, { message: 'version deve ser maior ou igual a 1' }),
    Max(MAX_VERSION, { message: 'version inválida' }),
  );
