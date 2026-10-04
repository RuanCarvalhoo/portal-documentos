import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/transforms';

export class CreateSpaceDto {
  /** @example Arquitetura */
  @Transform(trim, { toClassOnly: true })
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'Informe o nome do espaço' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  name: string;

  /** @example Visão geral da arquitetura do sistema */
  @IsOptional()
  @Transform(trim, { toClassOnly: true })
  @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  description?: string;
}
