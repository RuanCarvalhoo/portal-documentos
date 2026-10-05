import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../roles';

/** Perfil público: nunca inclui o hash da senha */
export class AuthUserDto {
  id: string;
  name: string;
  email: string;
  /** Perfil de acesso: conta nova entra como READER e um ADMIN a promove */
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;
}

export class AuthResponseDto {
  /** JWT para o header `Authorization: Bearer <token>` */
  accessToken: string;
  user: AuthUserDto;
}
