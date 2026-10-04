import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { toHttpError } from './http-error';

/** Formato único de erro da API: { statusCode, error, message, path, timestamp }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const { status, message } = toHttpError(exception);

    if (status >= 500) {
      // O detalhe (stack) fica só no log do servidor; o cliente recebe a mensagem genérica
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    http
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        error: STATUS_CODES[status] ?? 'Error',
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
  }
}
