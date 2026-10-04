import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
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

describe('toHttpError edge cases', () => {
  it('honours 4xx errors raised by the body parser', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });
    expect(toHttpError(tooLarge)).toEqual({ status: 413, message: 'request entity too large' });
  });

  it('does not trust a status on errors not marked as exposable', () => {
    expect(toHttpError(Object.assign(new Error('boom'), { status: 400 })).status).toBe(500);
  });

  it('falls back to the exception message when the body has no usable message', () => {
    expect(toHttpError(new HttpException({ detail: 'x' }, 503))).toEqual({
      status: 503,
      message: 'Http Exception',
    });
  });
});
