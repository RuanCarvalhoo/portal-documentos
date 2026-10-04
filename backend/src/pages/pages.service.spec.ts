import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagesService } from './pages.service';

const USER = 'u1';

describe('PagesService', () => {
  const prisma = {
    space: { findUnique: jest.fn(), findMany: jest.fn() },
    page: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const service = new PagesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('answers 404 when the space does not exist', async () => {
      prisma.space.findUnique.mockResolvedValue(null);

      await expect(service.create('s1', { title: 'Nova' }, USER)).rejects.toThrow(
        new NotFoundException('Espaço não encontrado'),
      );
    });

    it('rejects a parent page from another space', async () => {
      prisma.space.findUnique.mockResolvedValue({ id: 's1' });
      prisma.page.findUnique.mockResolvedValue({ spaceId: 'outro' });

      await expect(service.create('s1', { title: 'Nova', parentId: 'p1' }, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.page.create).not.toHaveBeenCalled();
    });

    it('records the author and appends the page after its siblings', async () => {
      prisma.space.findUnique.mockResolvedValue({ id: 's1' });
      prisma.page.aggregate.mockResolvedValue({ _max: { position: 2 } });
      prisma.page.create.mockResolvedValue({ id: 'new' });

      await service.create('s1', { title: 'Nova', content: '# Oi' }, USER);

      expect(prisma.page.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Nova',
            content: '# Oi',
            spaceId: 's1',
            parentId: null,
            position: 3,
            createdById: USER,
            updatedById: USER,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const current = { id: 'a', spaceId: 's1', parentId: null };

    it('answers 404 when the page does not exist', async () => {
      prisma.page.findUnique.mockResolvedValue(null);

      await expect(service.update('a', { title: 'x', version: 1 }, USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('answers 409 when someone else saved a newer version first', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.page.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update('a', { title: 'x', version: 1 }, USER)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('bumps the version, records the editor and the edit time', async () => {
      prisma.page.findUnique.mockResolvedValueOnce(current).mockResolvedValueOnce({ id: 'a' });
      prisma.page.updateMany.mockResolvedValue({ count: 1 });

      await service.update('a', { content: 'novo', version: 3 }, USER);

      expect(prisma.page.updateMany).toHaveBeenCalledWith({
        where: { id: 'a', version: 3 },
        data: expect.objectContaining({
          content: 'novo',
          updatedById: USER,
          version: { increment: 1 },
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('refuses to move a page under one of its own descendants', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.page.findMany.mockResolvedValue([
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' },
      ]);

      await expect(service.update('a', { parentId: 'b', version: 1 }, USER)).rejects.toThrow(
        new BadRequestException(
          'Uma página não pode ser movida para dentro dela mesma ou de uma subpágina',
        ),
      );
      expect(prisma.page.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an update that only sends the version', async () => {
      await expect(service.update('a', { version: 1 }, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('answers 404 for a page that does not exist', async () => {
    prisma.page.findUnique.mockResolvedValue(null);

    await expect(service.findOne('x')).rejects.toThrow(new NotFoundException('Página não encontrada'));
  });

  it('builds the navigation of every space from two queries', async () => {
    prisma.space.findMany.mockResolvedValue([
      { id: 's1', name: 'Arquitetura' },
      { id: 's2', name: 'Vazio' },
    ]);
    prisma.page.findMany.mockResolvedValue([
      { id: 'a', title: 'Introdução', parentId: null, spaceId: 's1' },
      { id: 'b', title: 'API', parentId: 'a', spaceId: 's1' },
    ]);

    const navigation = await service.navigation();

    expect(navigation).toEqual([
      {
        id: 's1',
        name: 'Arquitetura',
        pages: [
          { id: 'a', title: 'Introdução', children: [{ id: 'b', title: 'API', children: [] }] },
        ],
      },
      { id: 's2', name: 'Vazio', pages: [] },
    ]);
    expect(prisma.page.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.page.findMany.mock.calls[0][0].select).not.toHaveProperty('content');
  });
});
