import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { trim, trimToNull } from '../../common/transforms';

// Regras compartilhadas por criação e edição
export const SpaceNameRules = (): PropertyDecorator =>
  applyDecorators(
    Transform(trim, { toClassOnly: true }),
    IsString({ message: 'O nome deve ser um texto' }),
    IsNotEmpty({ message: 'Informe o nome do espaço' }),
    MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' }),
  );

export const SpaceDescriptionRules = (): PropertyDecorator =>
  applyDecorators(
    IsOptional(),
    Transform(trimToNull, { toClassOnly: true }),
    IsString({ message: 'A descrição deve ser um texto' }),
    MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' }),
  );

export class CreateSpaceDto {
  /** @example Arquitetura */
  @SpaceNameRules()
  name: string;

  /** @example Visão geral da arquitetura do sistema */
  @SpaceDescriptionRules()
  description?: string | null;
}
