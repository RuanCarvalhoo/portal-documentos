import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

export interface HttpError {
  status: number;
  message: string | string[];
}

// Erros do Prisma causados pela requisição (e não por falha do servidor)
const PRISMA_ERRORS: Readonly<Record<string, HttpError>> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Registro já existe' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referência a um registro inexistente' },
};

const INTERNAL_ERROR: HttpError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  message: 'Erro interno do servidor',
};

/** Traduz qualquer exceção para status + mensagem segura de expor ao cliente. */
export function toHttpError(exception: unknown): HttpError {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ?? exception.message);
    return { status: exception.getStatus(), message };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return { ...(PRISMA_ERRORS[exception.code] ?? INTERNAL_ERROR) };
  }
  return { ...INTERNAL_ERROR };
}
