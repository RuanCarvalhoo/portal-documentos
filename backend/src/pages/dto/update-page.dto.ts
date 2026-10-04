import { IsInt, Max, Min, ValidateIf } from 'class-validator';

// version é int4 no Postgres: acima disso a query falharia com erro 500
const MAX_VERSION = 2_147_483_647;
import { PageContentRules, PageTitleRules, ParentIdRules } from './create-page.dto';

export class UpdatePageDto {
  /** Novo título (omitir mantém o atual) */
  @ValidateIf((_, value) => value !== undefined)
  @PageTitleRules()
  title?: string;

  /** Novo conteúdo em Markdown (omitir mantém o atual) */
  @PageContentRules()
  content?: string;

  /** Novo pai no mesmo espaço; null move para a raiz; omitir mantém o atual */
  @ParentIdRules()
  parentId?: string | null;

  /**
   * Versão que o cliente leu. Se outra pessoa salvou antes, a API responde 409
   * em vez de sobrescrever a edição dela (concorrência otimista).
   * @example 1
   */
  @IsInt({ message: 'version deve ser um número inteiro' })
  @Min(1, { message: 'version deve ser maior ou igual a 1' })
  @Max(MAX_VERSION, { message: 'version inválida' })
  version: number;
}
