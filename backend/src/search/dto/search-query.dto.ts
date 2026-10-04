import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { trim } from '../../common/transforms';

// Trigramas: com menos de 3 caracteres o índice GIN não ajuda e a busca vira varredura total
export const MIN_SEARCH_LENGTH = 3;

export class SearchQueryDto extends PaginationQueryDto {
  /**
   * Termo buscado no título e no conteúdo, sem diferenciar maiúsculas
   * @example markdown
   */
  @Transform(trim, { toClassOnly: true })
  @IsString({ message: 'Informe o termo da busca' })
  @MinLength(MIN_SEARCH_LENGTH, {
    message: `Use pelo menos ${MIN_SEARCH_LENGTH} caracteres na busca`,
  })
  @MaxLength(100, { message: 'A busca deve ter no máximo 100 caracteres' })
  q: string;
}
