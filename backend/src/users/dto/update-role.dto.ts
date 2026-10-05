import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../auth/roles';

export class UpdateRoleDto {
  /** Novo perfil da conta */
  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.EDITOR })
  @IsEnum(Role, { message: 'Perfil inválido: use ADMIN, EDITOR ou READER' })
  role: Role;
}
