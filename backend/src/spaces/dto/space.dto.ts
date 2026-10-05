import { PaginationMetaDto } from '../../common/pagination.dto';

export class SpaceDto {
  id: string;
  name: string;
  description: string | null;
  /** Versão atual, enviada de volta no PATCH (concorrência otimista) */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedSpacesDto {
  data: SpaceDto[];
  meta: PaginationMetaDto;
}
