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
  const bodyParserError = (status: number, type: string) =>
    Object.assign(new Error('english message'), { status, expose: true, type });

  it('honours 4xx errors raised by the body parser, with a Portuguese message', () => {
    expect(toHttpError(bodyParserError(413, 'entity.too.large'))).toEqual({
      status: 413,
      message: 'O corpo da requisição é grande demais',
    });
  });

  it('keeps the status of other body parser errors behind a generic message', () => {
    expect(toHttpError(bodyParserError(415, 'charset.unsupported'))).toEqual({
      status: 415,
      message: 'Requisição inválida',
    });
  });

  it('does not trust a status on errors not marked as exposable', () => {
    expect(toHttpError(Object.assign(new Error('boom'), { status: 400 })).status).toBe(500);
  });

  describe('English messages produced by the framework', () => {
    it('translates the unknown-field message of the validation pipe', () => {
      expect(
        toHttpError(new BadRequestException(['property role should not exist', 'Informe o nome'])).message,
      ).toEqual(['Campo não permitido: role', 'Informe o nome']);
    });

    it('translates a malformed percent-encoding in a URL parameter', () => {
      expect(toHttpError(new BadRequestException("Failed to decode param '%ZZ'")).message).toBe(
        'Parâmetro inválido na URL',
      );
    });

    it('translates an invalid JSON body', () => {
      expect(
        toHttpError(new BadRequestException(`Unexpected token 'x', "x" is not valid JSON`)).message,
      ).toBe('O corpo da requisição não é um JSON válido');
    });
  });

  it('falls back to the exception message when the body has no usable message', () => {
    expect(toHttpError(new HttpException({ detail: 'x' }, 503))).toEqual({
      status: 503,
      message: 'Http Exception',
    });
  });
});
