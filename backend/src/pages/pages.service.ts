import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { orNotFound } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { NavigationSpaceDto, PageDto } from './dto/page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { buildTree, isSelfOrDescendant, TreeRow } from './tree.util';

const AUTHOR = { select: { id: true, name: true } } as const;
const PAGE_FIELDS = {
  id: true,
  title: true,
  content: true,
  spaceId: true,
  parentId: true,
  position: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  createdBy: AUTHOR,
  updatedBy: AUTHOR,
} as const;
const NOT_FOUND = 'Página não encontrada';
const INVALID_PARENT = 'A página pai deve existir e estar no mesmo espaço';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(spaceId: string, dto: CreatePageDto, userId: string): Promise<PageDto> {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
    if (!space) {
      throw new NotFoundException('Espaço não encontrado');
    }
    const parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.prisma.page.findUnique({
        where: { id: parentId },
        select: { spaceId: true },
      });
      if (parent?.spaceId !== spaceId) {
        throw new BadRequestException(INVALID_PARENT);
      }
    }

    return this.prisma.page.create({
      data: {
        title: dto.title,
        content: dto.content ?? '',
        spaceId,
        parentId,
        position: await this.nextPosition(spaceId, parentId),
        createdById: userId,
        updatedById: userId,
      },
      select: PAGE_FIELDS,
    });
  }

  async findOne(id: string): Promise<PageDto> {
    const page = await this.prisma.page.findUnique({ where: { id }, select: PAGE_FIELDS });
    if (!page) {
      throw new NotFoundException(NOT_FOUND);
    }
    return page;
  }

  async update(id: string, dto: UpdatePageDto, userId: string): Promise<PageDto> {
    const { version, ...changes } = dto;
    if (Object.values(changes).every((value) => value === undefined)) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }
    const current = await this.prisma.page.findUnique({
      where: { id },
      select: { id: true, spaceId: true, parentId: true },
    });
    if (!current) {
      throw new NotFoundException(NOT_FOUND);
    }

    const moving = changes.parentId !== undefined && changes.parentId !== current.parentId;
    if (moving && changes.parentId) {
      await this.assertValidNewParent(current.id, current.spaceId, changes.parentId);
    }

    // Concorrência otimista: só grava se ninguém salvou depois da versão que o cliente leu.
    // updateMany não dispara @updatedAt, por isso updatedAt vai explícito.
    const { count } = await this.prisma.page.updateMany({
      where: { id, version },
      data: {
        ...changes,
        ...(moving && {
          position: await this.nextPosition(current.spaceId, changes.parentId ?? null),
        }),
        updatedById: userId,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (count === 0) {
      throw new ConflictException(
        'Esta página foi alterada por outra pessoa. Recarregue para ver a versão atual.',
      );
    }
    return this.findOne(id);
  }

  /** Exclui a página e, por ON DELETE CASCADE, todas as subpáginas. */
  async remove(id: string): Promise<void> {
    await orNotFound(this.prisma.page.delete({ where: { id }, select: { id: true } }), NOT_FOUND);
  }

  /** Todos os espaços com suas árvores: 2 queries (páginas sem content) e montagem em O(n). */
  async navigation(): Promise<NavigationSpaceDto[]> {
    const [spaces, pages] = await this.prisma.$transaction([
      this.prisma.space.findMany({
        select: { id: true, name: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.page.findMany({
        select: { id: true, title: true, parentId: true, spaceId: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const pagesBySpace = new Map<string, TreeRow[]>();
    for (const page of pages) {
      const rows = pagesBySpace.get(page.spaceId) ?? [];
      rows.push(page);
      pagesBySpace.set(page.spaceId, rows);
    }
    return spaces.map((space) => ({
      id: space.id,
      name: space.name,
      pages: buildTree(pagesBySpace.get(space.id) ?? []),
    }));
  }

  private async assertValidNewParent(pageId: string, spaceId: string, parentId: string): Promise<void> {
    // Uma query traz a hierarquia do espaço; a checagem de ciclo roda em memória
    const rows = await this.prisma.page.findMany({
      where: { spaceId },
      select: { id: true, parentId: true },
    });
    const parentById = new Map(rows.map((row) => [row.id, row.parentId]));
    if (!parentById.has(parentId)) {
      throw new BadRequestException(INVALID_PARENT);
    }
    if (isSelfOrDescendant(pageId, parentId, parentById)) {
      throw new BadRequestException(
        'Uma página não pode ser movida para dentro dela mesma ou de uma subpágina',
      );
    }
  }

  // Nova página (ou página movida) entra no fim da lista de irmãos
  private async nextPosition(spaceId: string, parentId: string | null): Promise<number> {
    const { _max } = await this.prisma.page.aggregate({
      where: { spaceId, parentId },
      _max: { position: true },
    });
    return (_max.position ?? -1) + 1;
  }
}
