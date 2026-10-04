import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from './transforms';

export class LoginDto {
  /** @example demo@example.com */
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email: string;

  /** @example demo1234 */
  @IsString({ message: 'A senha deve ser um texto' })
  @IsNotEmpty({ message: 'Informe a senha' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres' })
  password: string;
}
