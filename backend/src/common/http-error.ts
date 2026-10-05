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

// Mensagens que o próprio framework gera em inglês: o ValidationPipe (campo fora do DTO) e o
// Nest, que converte JSON inválido e "%" malformado na URL em BadRequestException com a
// mensagem original. A API fala pt-BR com quem a usa.
const FRAMEWORK_MESSAGES: ReadonlyArray<readonly [RegExp, (match: RegExpExecArray) => string]> = [
  [/^property (.+) should not exist$/, ([, field]) => `Campo não permitido: ${field}`],
  [/^Failed to decode param /, () => 'Parâmetro inválido na URL'],
  [/\bJSON\b/, () => 'O corpo da requisição não é um JSON válido'],
];

// Erros do body-parser chegam com um `type` estável; os demais ficam com a mensagem genérica
const BODY_PARSER_MESSAGES: Readonly<Record<string, string>> = {
  'entity.too.large': 'O corpo da requisição é grande demais',
};

/** Traduz qualquer exceção para status + mensagem segura de expor ao cliente. */
export function toHttpError(exception: unknown): HttpError {
  if (exception instanceof HttpException) {
    const message = messageOf(exception.getResponse()) ?? exception.message;
    return {
      status: exception.getStatus(),
      message: Array.isArray(message) ? message.map(translate) : translate(message),
    };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return { ...(PRISMA_ERRORS[exception.code] ?? INTERNAL_ERROR) };
  }
  if (isExposedClientError(exception)) {
    const type = 'type' in exception && typeof exception.type === 'string' ? exception.type : '';
    return { status: exception.status, message: BODY_PARSER_MESSAGES[type] ?? 'Requisição inválida' };
  }
  return { ...INTERNAL_ERROR };
}

function translate(message: string): string {
  for (const [pattern, toPortuguese] of FRAMEWORK_MESSAGES) {
    const match = pattern.exec(message);
    if (match) {
      return toPortuguese(match);
    }
  }
  return message;
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
