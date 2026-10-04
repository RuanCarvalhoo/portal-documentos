import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  const prisma = {
    page: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const service = new SearchService(prisma as unknown as PrismaService);
  const updatedAt = new Date('2026-01-01T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.page.findMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'Guia de Markdown',
        content: 'Use **markdown** para formatar.',
        spaceId: 's1',
        updatedAt,
        space: { name: 'Guias' },
      },
    ]);
    prisma.page.count.mockResolvedValue(1);
  });

  it('searches title and content without case sensitivity, always ordered', async () => {
    await service.search({ q: 'markdown', page: 1, limit: 20 });

    const args = prisma.page.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      OR: [
        { title: { contains: 'markdown', mode: 'insensitive' } },
        { content: { contains: 'markdown', mode: 'insensitive' } },
      ],
    });
    expect(args.orderBy).toBeDefined();
    expect(prisma.page.count).toHaveBeenCalledWith({ where: args.where });
  });

  it('returns each hit with its space name and a snippet, plus pagination metadata', async () => {
    const result = await service.search({ q: 'markdown', page: 2, limit: 5 });

    expect(result).toEqual({
      data: [
        {
          id: 'p1',
          title: 'Guia de Markdown',
          spaceId: 's1',
          spaceName: 'Guias',
          snippet: 'Use **markdown** para formatar.',
          updatedAt,
        },
      ],
      meta: { total: 1, page: 2, limit: 5 },
    });
    expect(prisma.page.findMany.mock.calls[0][0]).toMatchObject({ skip: 5, take: 5 });
  });
});
