import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail, trim } from './transforms';

export class RegisterDto {
  /**
   * Nome exibido nas páginas (criado/editado por)
   * @example Ana Souza
   */
  @Transform(trim, { toClassOnly: true })
  @IsString({ message: 'O nome deve ser um texto' })
  @Length(2, 80, { message: 'O nome deve ter entre 2 e 80 caracteres' })
  name: string;

  /**
   * E-mail de login (salvo em minúsculas)
   * @example ana@example.com
   */
  @Transform(normalizeEmail, { toClassOnly: true })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres' })
  email: string;

  /**
   * Senha com pelo menos 8 caracteres e no máximo 72 bytes (o bcrypt ignora o que passa disso;
   * acentos e emojis ocupam mais de 1 byte)
   * @example senha-forte-1
   */
  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @IsByteLength(0, 72, { message: 'A senha deve ter no máximo 72 bytes' })
  password: string;
}
