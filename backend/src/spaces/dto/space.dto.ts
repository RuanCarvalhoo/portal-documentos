import { PaginationMetaDto } from '../../common/pagination.dto';

export class SpaceDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedSpacesDto {
  data: SpaceDto[];
  meta: PaginationMetaDto;
}
