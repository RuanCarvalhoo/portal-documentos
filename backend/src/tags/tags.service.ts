import { Injectable, NotFoundException } from '@nestjs/common';
import { Paginated, PaginationQueryDto, toPage, toSkipTake } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TaggedPageDto, TagSummaryDto } from './dto/tag.dto';
import { TAG_NAMES } from './tags.util';

// Tags sem nenhuma página (todas removidas ou excluídas) ficam na tabela, mas fora das listas
const IN_USE = { pages: { some: {} } } as const;

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tags em uso, em ordem alfabética, com a quantidade de páginas de cada uma. */
  async findAll(query: PaginationQueryDto): Promise<Paginated<TagSummaryDto>> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tag.findMany({
        where: IN_USE,
        select: { name: true, _count: { select: { pages: true } } },
        orderBy: { name: 'asc' },
        ...toSkipTake(query),
      }),
      this.prisma.tag.count({ where: IN_USE }),
    ]);
    return toPage(
      rows.map(({ name, _count }) => ({ name, pageCount: _count.pages })),
      total,
      query,
    );
  }

  /** Páginas com a tag, das editadas mais recentemente para as mais antigas. */
  async pages(name: string, query: PaginationQueryDto): Promise<Paginated<TaggedPageDto>> {
    const where = { tags: { some: { tag: { name } } } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          spaceId: true,
          updatedAt: true,
          space: { select: { name: true } },
          tags: TAG_NAMES,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.page.count({ where }),
    ]);
    if (total === 0) {
      throw new NotFoundException('Nenhuma página com esta tag');
    }
    return toPage(
      rows.map(({ space, tags, ...page }) => ({
        ...page,
        spaceName: space.name,
        tags: tags.map(({ tag }) => tag.name),
      })),
      total,
      query,
    );
  }
}
