import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { lowercase, trim } from '../../common/transforms';
import { MAX_TAG_LENGTH, MAX_TAGS_PER_PAGE, normalizeTags, TAG_PATTERN } from '../../tags/tags.util';
import { MAX_CONTENT_LENGTH } from '../page-limits';

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
  applyDecorators(
    IsOptional(),
    IsUUID('all', { message: 'parentId deve ser um identificador válido' }),
    Transform(lowercase),
  );

// Lista completa: no PATCH substitui as tags da página; omitir mantém as atuais
export const TagsRules = (): PropertyDecorator =>
  applyDecorators(
    IsOptional(),
    Transform(({ value }) => normalizeTags(value)),
    IsArray({ message: 'tags deve ser uma lista de textos' }),
    ArrayMaxSize(MAX_TAGS_PER_PAGE, { message: `Use no máximo ${MAX_TAGS_PER_PAGE} tags por página` }),
    IsString({ each: true, message: 'Cada tag deve ser um texto' }),
    MaxLength(MAX_TAG_LENGTH, {
      each: true,
      message: `Cada tag deve ter no máximo ${MAX_TAG_LENGTH} caracteres`,
    }),
    Matches(TAG_PATTERN, {
      each: true,
      message: 'Tags usam só letras, números e hífens (ex.: banco-de-dados)',
    }),
  );

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

  /**
   * Tags (normalizadas: minúsculas, hífens no lugar de espaços; até 10)
   * @example ["arquitetura", "backend"]
   */
  @TagsRules()
  tags?: string[];
}
