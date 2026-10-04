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
    return {
      status: exception.getStatus(),
      message: messageOf(exception.getResponse()) ?? exception.message,
    };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return { ...(PRISMA_ERRORS[exception.code] ?? INTERNAL_ERROR) };
  }
  if (isExposedClientError(exception)) {
    return { status: exception.status, message: exception.message };
  }
  return { ...INTERNAL_ERROR };
}

function messageOf(body: unknown): string | string[] | undefined {
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;
    const isStringList = Array.isArray(message) && message.every((m) => typeof m === 'string');
    if (typeof message === 'string' || isStringList) {
      return message as string | string[];
    }
  }
  return undefined;
}

// Erros do body-parser (pacote http-errors: 413, 415, JSON inválido...) não são HttpException,
// mas trazem status 4xx e expose=true — o mesmo critério do BaseExceptionFilter do Nest.
function isExposedClientError(exception: unknown): exception is Error & { status: number } {
  return (
    exception instanceof Error &&
    'status' in exception &&
    typeof exception.status === 'number' &&
    exception.status >= 400 &&
    exception.status < 500 &&
    'expose' in exception &&
    exception.expose === true
  );
}
