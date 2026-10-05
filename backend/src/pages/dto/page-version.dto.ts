import { PaginationMetaDto } from '../../common/pagination.dto';
import { UserSummaryDto } from './page.dto';

export class PageVersionSummaryDto {
  /** Número da versão: o `version` que a página tinha antes da edição que a substituiu */
  version: number;
  title: string;
  /** Quem escreveu esta versão */
  editedBy: UserSummaryDto;
  editedAt: Date;
}

export class PageVersionDto extends PageVersionSummaryDto {
  pageId: string;
  /** Markdown desta versão */
  content: string;
}

export class PaginatedPageVersionsDto {
  data: PageVersionSummaryDto[];
  meta: PaginationMetaDto;
}
