import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// Teto de itens por página: nenhuma listagem devolve a tabela inteira
export const MAX_PAGE_SIZE = 50;
// Teto de página: sem ele, page enorme estoura o OFFSET (int64) e vira erro 500
export const MAX_PAGE = 100_000;

export class PaginationQueryDto {
  /**
   * Página, começando em 1
   * @example 1
   */
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro' })
  @Min(1, { message: 'page deve ser maior ou igual a 1' })
  @Max(MAX_PAGE, { message: `page deve ser no máximo ${MAX_PAGE}` })
  page: number = 1;

  /**
   * Itens por página (máximo 50)
   * @example 20
   */
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro' })
  @Min(1, { message: 'limit deve ser maior ou igual a 1' })
  @Max(MAX_PAGE_SIZE, { message: `limit deve ser no máximo ${MAX_PAGE_SIZE}` })
  limit: number = 20;
}

export class PaginationMetaDto {
  total: number;
  page: number;
  limit: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export function toSkipTake({ page, limit }: PaginationQueryDto): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function toPage<T>(data: T[], total: number, { page, limit }: PaginationQueryDto): Paginated<T> {
  return { data, meta: { total, page, limit } };
}
