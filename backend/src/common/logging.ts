import type { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { hostname } from 'node:os';
import { stdTimeFunctions } from 'pino';
import type { Env } from '../config/env.validation';
import { clientIpOf } from './client-ip';

/** Id da requisição: vem do proxy do frontend (ou de outro cliente) e volta na resposta. */
export const REQUEST_ID_HEADER = 'x-request-id';
// Vai para o log e para o header de resposta: só um formato que não quebre nenhum dos dois
const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

type RequestWithUser = IncomingMessage & { id?: unknown; user?: { id: string }; originalUrl?: string };

/** Reaproveita o id recebido quando é seguro (correlaciona com o log do frontend); senão, gera. */
export function requestIdFor(request: IncomingMessage, response: ServerResponse): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const id = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  response.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/** Caminho sem a query string: termos de busca não vão para o log. */
export function pathOf(request: { url?: string; originalUrl?: string }): string {
  const url = request.originalUrl ?? request.url ?? '';
  const query = url.indexOf('?');
  return query === -1 ? url : url.slice(0, query);
}

/** 5xx é erro do servidor; 4xx é aviso (cliente errou, mas vale acompanhar); o resto é info. */
export function levelFor(
  _request: IncomingMessage,
  response: ServerResponse,
  error?: Error,
): 'info' | 'warn' | 'error' {
  if (error || response.statusCode >= 500) {
    return 'error';
  }
  return response.statusCode >= 400 ? 'warn' : 'info';
}

/**
 * Configuração dos logs (pino via nestjs-pino), ADR 009. Uma linha JSON por evento em stdout:
 * - toda requisição gera uma linha ao terminar, com método, caminho, status, duração, usuário e
 *   IP do cliente (o mesmo do rate limit), exceto o /health do healthcheck;
 * - todo log feito durante a requisição (Logger do Nest nos services) leva o `requestId`;
 * - nada de headers (token, segredo do proxy) nem query string.
 */
export function loggerParams(config: Pick<Env, 'LOG_LEVEL' | 'LOG_PRETTY' | 'INTERNAL_API_SECRET'>): Params {
  return {
    pinoHttp: {
      level: config.LOG_LEVEL,
      // Legível no terminal de desenvolvimento; JSON em qualquer outro lugar
      transport: config.LOG_PRETTY
        ? { target: 'pino-pretty', options: { singleLine: true, ignore: 'pid,hostname,service' } }
        : undefined,
      // hostname distingue as réplicas da API quando os logs se juntam num coletor
      base: { service: 'api', hostname: hostname() },
      timestamp: stdTimeFunctions.isoTime,
      // "level":"warn" em vez do número do pino: legível e fácil de filtrar em qualquer coletor
      formatters: { level: (label) => ({ level: label }) },
      genReqId: requestIdFor,
      // Logs feitos durante a requisição levam só o id (não repetem o objeto req inteiro)
      quietReqLogger: true,
      customAttributeKeys: { reqId: 'requestId' },
      customLogLevel: levelFor,
      customSuccessMessage: (request, response, responseTime) =>
        `${request.method} ${pathOf(request as RequestWithUser)} ${response.statusCode} ${responseTime}ms`,
      customErrorMessage: (request, response) =>
        `${request.method} ${pathOf(request as RequestWithUser)} ${response.statusCode}`,
      // O erro em si (com stack) já sai no log do AllExceptionsFilter, com o mesmo requestId
      customErrorObject: (_request, _response, _error, value: Record<string, unknown>) => ({
        res: value.res,
        responseTime: value.responseTime,
      }),
      // Avaliado no início e no fim da requisição: no fim o AuthGuard já identificou o usuário
      customProps: (request) => {
        const user = (request as RequestWithUser).user;
        return user ? { userId: user.id } : {};
      },
      serializers: {
        req: (request: { id: unknown; method: string; raw: RequestWithUser & { ip?: string } }) => ({
          id: request.id,
          method: request.method,
          path: pathOf(request.raw),
          clientIp: clientIpOf(
            { ip: request.raw.ip, headers: request.raw.headers },
            config.INTERNAL_API_SECRET,
          ),
        }),
        res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
      },
      // O healthcheck do compose chama /health a cada 5 s: seria metade do log
      autoLogging: { ignore: (request) => pathOf(request as RequestWithUser) === '/health' },
    },
  };
}
