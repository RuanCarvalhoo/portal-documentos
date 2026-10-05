import { ValidateIf } from 'class-validator';
import { VersionRules } from '../../common/version';
import { SpaceDescriptionRules, SpaceNameRules } from './create-space.dto';

// Sem PartialType: o IsOptional que ele adiciona também deixa passar null, e null no nome
// (coluna obrigatória) chegaria ao banco como erro 500.
export class UpdateSpaceDto {
  /**
   * Novo nome (omitir mantém o atual; null não é aceito)
   * @example Arquitetura de Software
   */
  @ValidateIf((_, value) => value !== undefined)
  @SpaceNameRules()
  name?: string;

  /** Nova descrição (null ou texto vazio remove a descrição) */
  @SpaceDescriptionRules()
  description?: string | null;

  /**
   * Versão que o cliente leu. Se outra pessoa salvou antes, a API responde 409
   * em vez de sobrescrever a edição dela (concorrência otimista).
   * @example 1
   */
  @VersionRules()
  version: number;
}
