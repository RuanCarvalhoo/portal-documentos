import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { trim } from '../../common/transforms';

// Trigramas vêm de letras/números: sem 3 seguidos (ex.: "ab", "---") o índice GIN não se
// aplica e a busca vira varredura da tabela inteira
export const MIN_SEARCH_LENGTH = 3;
// MIN_SEARCH_LENGTH letras ou números seguidos (\p{L} cobre letras acentuadas)
const SEARCHABLE = /[\p{L}\p{N}]{3}/u;

export class SearchQueryDto extends PaginationQueryDto {
  /**
   * Termo buscado no título e no conteúdo, sem diferenciar maiúsculas
   * @example markdown
   */
  @Transform(trim, { toClassOnly: true })
  @IsString({ message: 'Informe o termo da busca' })
  @Matches(SEARCHABLE, {
    message: `Use pelo menos ${MIN_SEARCH_LENGTH} letras ou números seguidos na busca`,
  })
  @MaxLength(100, { message: 'A busca deve ter no máximo 100 caracteres' })
  q: string;
}
