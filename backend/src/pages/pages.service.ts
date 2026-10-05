import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { orNotFound } from '../common/prisma-errors';
import { Prisma } from '../generated/prisma/client';
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
type Tx = Prisma.TransactionClient;

const NOT_FOUND = 'Página não encontrada';
const INVALID_PARENT = 'A página pai deve existir e estar no mesmo espaço';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(spaceId: string, dto: CreatePageDto, userId: string): Promise<PageDto> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockSpace(tx, spaceId))) {
        throw new NotFoundException('Espaço não encontrado');
      }
      const parentId = dto.parentId ?? null;
      if (parentId) {
        const parent = await tx.page.findUnique({ where: { id: parentId }, select: { spaceId: true } });
        if (parent?.spaceId !== spaceId) {
          throw new BadRequestException(INVALID_PARENT);
        }
      }
      return tx.page.create({
        data: {
          title: dto.title,
          content: dto.content ?? '',
          spaceId,
          parentId,
          position: await this.nextPosition(tx, spaceId, parentId),
          createdById: userId,
          updatedById: userId,
        },
        select: PAGE_FIELDS,
      });
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
      select: { spaceId: true, parentId: true },
    });
    if (!current) {
      throw new NotFoundException(NOT_FOUND);
    }
    const moving = changes.parentId !== undefined && changes.parentId !== current.parentId;

    try {
      return await this.prisma.$transaction(async (tx) => {
        let position: number | undefined;
        if (moving) {
          await this.lockSpace(tx, current.spaceId);
          if (changes.parentId) {
            await this.assertValidNewParent(tx, id, current.spaceId, changes.parentId);
          }
          position = await this.nextPosition(tx, current.spaceId, changes.parentId ?? null);
        }
        // Concorrência otimista num único UPDATE ... WHERE id = ? AND version = ? RETURNING:
        // só grava se ninguém salvou depois da versão que o cliente leu
        return tx.page.update({
          where: { id, version },
          data: { ...changes, position, updatedById: userId, version: { increment: 1 } },
          select: PAGE_FIELDS,
        });
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // Nenhuma linha casou: ou a versão ficou velha (409) ou a página sumiu no meio (404)
        const stillExists = (await this.prisma.page.count({ where: { id } })) > 0;
        throw stillExists
          ? new ConflictException(
              'Esta página foi alterada por outra pessoa. Recarregue para ver a versão atual.',
            )
          : new NotFoundException(NOT_FOUND);
      }
      throw error;
    }
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

  /**
   * Trava a linha do espaço até o fim da transação: criações e movimentações no mesmo espaço
   * entram em fila, então duas movimentações opostas simultâneas não criam um ciclo e duas
   * criações não disputam a mesma posição. Devolve false se o espaço não existe.
   */
  private async lockSpace(tx: Tx, spaceId: string): Promise<boolean> {
    // Tagged template: o id vira parâmetro da query ($1), nunca SQL concatenado
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM spaces WHERE id = ${spaceId}::uuid FOR UPDATE
    `;
    return rows.length > 0;
  }

  private async assertValidNewParent(
    tx: Tx,
    pageId: string,
    spaceId: string,
    parentId: string,
  ): Promise<void> {
    // Uma query traz a hierarquia do espaço; a checagem de ciclo roda em memória
    const rows = await tx.page.findMany({
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
  private async nextPosition(tx: Tx, spaceId: string, parentId: string | null): Promise<number> {
    const { _max } = await tx.page.aggregate({
      where: { spaceId, parentId },
      _max: { position: true },
    });
    return (_max.position ?? -1) + 1;
  }
}
