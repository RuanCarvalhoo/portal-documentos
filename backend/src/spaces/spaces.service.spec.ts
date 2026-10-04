import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from './spaces.service';

const space = {
  id: 's1',
  name: 'Arquitetura',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const notFound = () =>
  new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 't' });

describe('SpacesService', () => {
  const prisma = {
    space: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const service = new SpacesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists a page of spaces with pagination metadata', async () => {
    prisma.space.findMany.mockResolvedValue([space]);
    prisma.space.count.mockResolvedValue(21);

    const result = await service.findAll({ page: 2, limit: 10 });

    expect(result).toEqual({ data: [space], meta: { total: 21, page: 2, limit: 10 } });
    expect(prisma.space.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('answers 404 for a space that does not exist', async () => {
    prisma.space.findUnique.mockResolvedValue(null);

    await expect(service.findOne('s1')).rejects.toThrow(
      new NotFoundException('Espaço não encontrado'),
    );
  });

  it('answers 404 when updating a space that does not exist', async () => {
    prisma.space.update.mockRejectedValue(notFound());

    await expect(service.update('s1', { name: 'Novo' })).rejects.toThrow(
      new NotFoundException('Espaço não encontrado'),
    );
  });

  it('rejects an update without any field', async () => {
    await expect(service.update('s1', { name: undefined })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.space.update).not.toHaveBeenCalled();
  });

  it('answers 404 when deleting a space that does not exist', async () => {
    prisma.space.delete.mockRejectedValue(notFound());

    await expect(service.remove('s1')).rejects.toThrow(
      new NotFoundException('Espaço não encontrado'),
    );
  });

  it('propagates unexpected database errors untouched', async () => {
    const failure = new Error('connection lost');
    prisma.space.delete.mockRejectedValue(failure);

    await expect(service.remove('s1')).rejects.toBe(failure);
  });
});
