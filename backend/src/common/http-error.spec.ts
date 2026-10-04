import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { toHttpError } from './http-error';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test' });

describe('toHttpError', () => {
  it('keeps status and message of an HttpException', () => {
    expect(toHttpError(new NotFoundException('Página não encontrada'))).toEqual({
      status: 404,
      message: 'Página não encontrada',
    });
  });

  it('keeps the list of validation messages', () => {
    expect(toHttpError(new BadRequestException(['title should not be empty']))).toEqual({
      status: 400,
      message: ['title should not be empty'],
    });
  });

  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2003', 400],
  ])('maps prisma error %s to status %i', (code, status) => {
    expect(toHttpError(prismaError(code)).status).toBe(status);
  });

  it('treats unmapped prisma errors as internal errors', () => {
    expect(toHttpError(prismaError('P2034')).status).toBe(500);
  });

  it('hides the details of unknown errors behind a generic 500', () => {
    expect(toHttpError(new Error('password=secret leaked'))).toEqual({
      status: 500,
      message: 'Erro interno do servidor',
    });
  });
});
