import type { TransformFnParams } from 'class-transformer';

export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// E-mail único sem diferenciar maiúsculas: "Ana@x.com" e "ana@x.com" são a mesma conta
export const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// Id em minúsculas, como o banco devolve: a aplicação compara ids como texto
export const lowercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.toLowerCase() : value;

// Texto opcional: só espaços vira null (sem distinção entre "" e null no banco)
export const trimToNull = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() || null : value;
