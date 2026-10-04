// Validação no cliente: dá retorno imediato; a API continua sendo a fonte da verdade

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

// Mesma ideia do @IsEmail da API, sem pretender cobrir a RFC inteira
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}
