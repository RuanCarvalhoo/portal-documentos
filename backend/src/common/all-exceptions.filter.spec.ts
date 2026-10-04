import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(headersSent = false) {
  const response = { headersSent, status: jest.fn().mockReturnThis(), json: jest.fn() };
  const request = { method: 'GET', url: '/pages/1?q=termo', path: '/pages/1' };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let errorLog: jest.SpyInstance;
  let warnLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes the standard envelope without logging expected errors', () => {
    const { host, response } = createHost();

    filter.catch(new NotFoundException('Página não encontrada'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'Página não encontrada',
      path: '/pages/1?q=termo',
      timestamp: expect.any(String),
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('logs unexpected errors with their stack but never sends it', () => {
    const { host, response } = createHost();

    filter.catch(new Error('db password leaked'), host);

    expect(errorLog).toHaveBeenCalledWith('GET /pages/1', expect.stringContaining('leaked'));
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain('leaked');
  });

  it('leaves a warning with the code of mapped prisma errors', () => {
    const { host } = createHost();
    const error = new Prisma.PrismaClientKnownRequestError('x', { code: 'P2025', clientVersion: 't' });

    filter.catch(error, host);

    expect(warnLog).toHaveBeenCalledWith(expect.stringContaining('P2025'));
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('does not write when the response headers were already sent', () => {
    const { host, response } = createHost(true);

    filter.catch(new Error('late failure'), host);

    expect(response.status).not.toHaveBeenCalled();
  });
});
