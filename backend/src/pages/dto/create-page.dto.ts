import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { trim } from '../../common/transforms';

// Teto do Markdown em caracteres. O corpo da requisição ainda passa pelo limite do body parser
// (100 KB): texto com muitos caracteres multibyte pode receber 413 antes de chegar aqui.
export const MAX_CONTENT_LENGTH = 50_000;

export const PageTitleRules = (): PropertyDecorator =>
  applyDecorators(
    Transform(trim, { toClassOnly: true }),
    IsString({ message: 'O título deve ser um texto' }),
    IsNotEmpty({ message: 'Informe o título da página' }),
    MaxLength(200, { message: 'O título deve ter no máximo 200 caracteres' }),
  );

// null não é "ausente": conteúdo é coluna obrigatória (vazio = "")
export const PageContentRules = (): PropertyDecorator =>
  applyDecorators(
    ValidateIf((_, value) => value !== undefined),
    IsString({ message: 'O conteúdo deve ser um texto em Markdown' }),
    MaxLength(MAX_CONTENT_LENGTH, {
      message: `O conteúdo deve ter no máximo ${MAX_CONTENT_LENGTH} caracteres`,
    }),
  );

// Aqui null é válido: significa "sem pai" (raiz do espaço)
export const ParentIdRules = (): PropertyDecorator =>
  applyDecorators(IsOptional(), IsUUID('all', { message: 'parentId deve ser um identificador válido' }));

export class CreatePageDto {
  /** @example Introdução */
  @PageTitleRules()
  title: string;

  /**
   * Conteúdo em Markdown
   * @example ## Visão geral
   */
  @PageContentRules()
  content?: string;

  /** Página pai no mesmo espaço (omitir ou null cria na raiz) */
  @ParentIdRules()
  parentId?: string | null;
}
