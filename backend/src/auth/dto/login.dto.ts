import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizeEmail } from '../../common/transforms';

export class LoginDto {
  /** @example demo@example.com */
  @Transform(normalizeEmail, { toClassOnly: true })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email: string;

  /** @example demo1234 */
  @IsString({ message: 'A senha deve ser um texto' })
  @IsNotEmpty({ message: 'Informe a senha' })
  @IsByteLength(0, 72, { message: 'A senha deve ter no máximo 72 bytes' })
  password: string;
}
