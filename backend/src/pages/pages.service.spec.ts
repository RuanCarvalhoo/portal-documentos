import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PagesService } from './pages.service';
import { MAX_TREE_DEPTH } from './tree.util';

const USER = 'u1';
const notMatched = () =>
  new Prisma.PrismaClientKnownRequestError('no match', { code: 'P2025', clientVersion: 't' });
// p1 ─ p2 ─ … ─ pN: cada página é filha da anterior (pN fica no nível N)
const chain = (levels: number) =>
  Array.from({ length: levels }, (_, i) => ({ id: `p${i + 1}`, parentId: i === 0 ? null : `p${i}` }));

describe('PagesService', () => {
  const prisma = {
    space: { findMany: jest.fn() },
    page: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    tag: { createMany: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  // Interativa (callback recebe o próprio mock como tx) ou em lote (array de promessas)
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
  );
  const service = new PagesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    // clearAllMocks preserva a implementação do $transaction definida acima
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('answers 404 when the space does not exist', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.create('s1', { title: 'Nova' }, USER)).rejects.toThrow(
        new NotFoundException('Espaço não encontrado'),
      );
    });

    it('rejects a parent page from another space', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 's1' }]);
      // A hierarquia carregada é só a do espaço s1, onde p1 não existe
      prisma.page.findMany.mockResolvedValue([]);

      await expect(service.create('s1', { title: 'Nova', parentId: 'p1' }, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.page.create).not.toHaveBeenCalled();
    });

    it('allows the last level of the tree but not one more', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 's1' }]);
      prisma.page.findMany.mockResolvedValue(chain(MAX_TREE_DEPTH));
      prisma.page.aggregate.mockResolvedValue({ _max: { position: null } });
      prisma.page.create.mockResolvedValue({ id: 'new', tags: [] });

      await expect(service.create('s1', { title: 'Funda demais', parentId: 'p10' }, USER)).rejects.toThrow(
        new BadRequestException('A hierarquia de páginas pode ter no máximo 10 níveis'),
      );
      await service.create('s1', { title: 'No último nível', parentId: 'p9' }, USER);
      expect(prisma.page.create).toHaveBeenCalledTimes(1);
    });

    it('locks the space, records the author and appends after the siblings', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 's1' }]);
      prisma.page.aggregate.mockResolvedValue({ _max: { position: 2 } });
      prisma.page.create.mockResolvedValue({ id: 'new', tags: [] });

      await service.create('s1', { title: 'Nova', content: '# Oi' }, USER);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
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
    const current = { spaceId: 's1', parentId: null, tags: [] };

    it('answers 404 when the page does not exist', async () => {
      prisma.page.findUnique.mockResolvedValue(null);

      await expect(service.update('a', { title: 'x', version: 1 }, USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('saves only when the version matches, bumping it and recording the editor', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.page.update.mockResolvedValue({ id: 'a', tags: [] });

      await service.update('a', { content: 'novo', version: 3 }, USER);

      expect(prisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a', version: 3 },
          data: expect.objectContaining({
            content: 'novo',
            updatedById: USER,
            version: { increment: 1 },
          }),
        }),
      );
      // Edição de conteúdo não mexe na estrutura: sem lock do espaço
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('keeps the version when the update changes nothing', async () => {
      const page = {
        ...current,
        title: 'Título',
        content: 'Texto',
        version: 4,
        tags: [{ tag: { name: 'api' } }],
      };
      prisma.page.findUnique.mockResolvedValue(page);

      await expect(
        service.update(
          'a',
          { title: 'Título', content: 'Texto', parentId: null, tags: ['api'], version: 2 },
          USER,
        ),
      ).resolves.toEqual({ ...page, tags: ['api'] });
      expect(prisma.page.update).not.toHaveBeenCalled();
    });

    it('replaces the tags without touching the author nor the history', async () => {
      const updatedAt = new Date('2026-01-01');
      prisma.page.findUnique.mockResolvedValue({
        ...current,
        updatedAt,
        tags: [{ tag: { name: 'antiga' } }],
      });
      prisma.tag.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      prisma.page.update.mockResolvedValue({
        id: 'a',
        tags: [{ tag: { name: 'api' } }, { tag: { name: 'busca' } }],
      });

      const page = await service.update('a', { tags: ['busca', 'api'], version: 2 }, USER);

      expect(prisma.tag.createMany).toHaveBeenCalledWith({
        data: [{ name: 'busca' }, { name: 'api' }],
        skipDuplicates: true,
      });
      expect(prisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a', version: 2 },
          data: expect.objectContaining({
            tags: { deleteMany: {}, create: [{ tagId: 't1' }, { tagId: 't2' }] },
            updatedAt,
            version: { increment: 1 },
          }),
        }),
      );
      expect(prisma.page.update.mock.calls[0][0].data).not.toHaveProperty('updatedById');
      expect(page.tags).toEqual(['api', 'busca']);
    });

    it('treats the same tags in another order as no change', async () => {
      prisma.page.findUnique.mockResolvedValue({
        ...current,
        tags: [{ tag: { name: 'a' } }, { tag: { name: 'b' } }],
      });

      await service.update('a', { tags: ['b', 'a'], version: 1 }, USER);

      expect(prisma.page.update).not.toHaveBeenCalled();
    });

    it('answers 409 when someone else saved a newer version first', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.page.update.mockRejectedValue(notMatched());
      prisma.page.count.mockResolvedValue(1);

      await expect(service.update('a', { title: 'x', version: 1 }, USER)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('answers 404 when the page was deleted in the meantime', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.page.update.mockRejectedValue(notMatched());
      prisma.page.count.mockResolvedValue(0);

      await expect(service.update('a', { title: 'x', version: 1 }, USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to move a page under one of its own descendants', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.$queryRaw.mockResolvedValue([{ id: 's1' }]);
      prisma.page.findMany.mockResolvedValue([
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' },
      ]);

      await expect(service.update('a', { parentId: 'b', version: 1 }, USER)).rejects.toThrow(
        new BadRequestException('Uma página não pode ser movida para dentro dela mesma ou de uma subpágina'),
      );
      expect(prisma.page.update).not.toHaveBeenCalled();
    });

    it('refuses a move that would push the moved subtree past the maximum depth', async () => {
      prisma.page.findUnique.mockResolvedValue(current);
      prisma.$queryRaw.mockResolvedValue([{ id: 's1' }]);
      prisma.page.aggregate.mockResolvedValue({ _max: { position: null } });
      prisma.page.update.mockResolvedValue({ id: 'a', tags: [] });
      // "a" tem uma filha (ocupa 2 níveis); p8 está no nível 8 e p9 no nível 9
      prisma.page.findMany.mockResolvedValue([
        ...chain(9),
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' },
      ]);

      await expect(service.update('a', { parentId: 'p9', version: 1 }, USER)).rejects.toThrow(
        new BadRequestException('A hierarquia de páginas pode ter no máximo 10 níveis'),
      );
      await service.update('a', { parentId: 'p8', version: 1 }, USER);
      expect(prisma.page.update).toHaveBeenCalledTimes(1);
    });

    it('rejects an update that only sends the version', async () => {
      await expect(service.update('a', { version: 1 }, USER)).rejects.toBeInstanceOf(BadRequestException);
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
        pages: [{ id: 'a', title: 'Introdução', children: [{ id: 'b', title: 'API', children: [] }] }],
      },
      { id: 's2', name: 'Vazio', pages: [] },
    ]);
    expect(prisma.page.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.page.findMany.mock.calls[0][0].select).not.toHaveProperty('content');
  });
});
