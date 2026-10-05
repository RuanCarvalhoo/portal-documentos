import { ValidateIf } from 'class-validator';
import { VersionRules } from '../../common/version';
import { PageContentRules, PageTitleRules, ParentIdRules, TagsRules } from './create-page.dto';

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

  /** Lista completa de tags (substitui as atuais); omitir mantém as atuais */
  @TagsRules()
  tags?: string[];

  /**
   * Versão que o cliente leu. Se outra pessoa salvou antes, a API responde 409
   * em vez de sobrescrever a edição dela (concorrência otimista).
   * @example 1
   */
  @VersionRules()
  version: number;
}
