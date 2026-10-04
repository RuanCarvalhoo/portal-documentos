/** Perfil público: nunca inclui o hash da senha */
export class AuthUserDto {
  id: string;
  name: string;
  email: string;
}

export class AuthResponseDto {
  /** JWT para o header `Authorization: Bearer <token>` */
  accessToken: string;
  user: AuthUserDto;
}
