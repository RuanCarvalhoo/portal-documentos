import { PaginationMetaDto } from '../../common/pagination.dto';

export class TagSummaryDto {
  /** @example arquitetura */
  name: string;
  /** Quantas páginas têm a tag */
  pageCount: number;
}

export class PaginatedTagsDto {
  data: TagSummaryDto[];
  meta: PaginationMetaDto;
}

export class TaggedPageDto {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  updatedAt: Date;
  /** Todas as tags da página, em ordem alfabética */
  tags: string[];
}

export class PaginatedTaggedPagesDto {
  data: TaggedPageDto[];
  meta: PaginationMetaDto;
}
