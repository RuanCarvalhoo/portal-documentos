import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { Prisma } from '../generated/prisma/client';
import { toHttpError } from './http-error';

/** Formato único de erro da API: { statusCode, error, message, path, requestId, timestamp }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { status, message } = toHttpError(exception);

    // No log vai só método + path (sem query string, que pode conter termos de busca)
    this.log(exception, status, `${request.method} ${request.path}`);

    // Resposta já começou a ser enviada: não dá mais para trocar status nem corpo
    if (response.headersSent) {
      return;
    }
    // requestId: o mesmo das linhas de log desta requisição (quem reporta o erro informa o id)
    const requestId = (request as Request & { id?: unknown }).id;
    response.status(status).json({
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message,
      path: request.url,
      ...(typeof requestId === 'string' && { requestId }),
      timestamp: new Date().toISOString(),
    });
  }

  private log(exception: unknown, status: number, route: string): void {
    if (exception instanceof Prisma.PrismaClientKnownRequestError && status < 500) {
      // Vira 4xx, mas pode esconder um bug do servidor: deixa rastro com o código
      this.logger.warn(`${route} → ${status} (Prisma ${exception.code})`);
      return;
    }
    // HttpException é lançada de propósito; só o erro inesperado vai para o log com stack
    if (status >= 500 && !(exception instanceof HttpException)) {
      this.logger.error(route, exception instanceof Error ? exception.stack : String(exception));
    }
  }
}
