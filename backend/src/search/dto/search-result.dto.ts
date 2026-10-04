import { PaginationMetaDto } from '../../common/pagination.dto';

export class SearchResultDto {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  /** Trecho do conteúdo ao redor do termo encontrado */
  snippet: string;
  updatedAt: Date;
}

export class PaginatedSearchResultsDto {
  data: SearchResultDto[];
  meta: PaginationMetaDto;
}
