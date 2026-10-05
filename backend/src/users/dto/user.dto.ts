import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination.dto';
import { Role } from '../../auth/roles';

/** Conta como o Admin a vê na gestão de perfis (sem o hash da senha) */
export class UserDto {
  id: string;
  name: string;
  email: string;
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;
  createdAt: Date;
}

export class PaginatedUsersDto {
  data: UserDto[];
  meta: PaginationMetaDto;
}
