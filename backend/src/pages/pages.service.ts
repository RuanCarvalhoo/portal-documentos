import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Paginated, PaginationQueryDto, toPage, toSkipTake } from '../common/pagination.dto';
import { orNotFound } from '../common/prisma-errors';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { NavigationSpaceDto, PageDto } from './dto/page.dto';
import { PageVersionDto, PageVersionSummaryDto } from './dto/page-version.dto';
import { MAX_VERSION, UpdatePageDto } from './dto/update-page.dto';
import { buildTree, depthOf, isSelfOrDescendant, MAX_TREE_DEPTH, subtreeHeight, TreeRow } from './tree.util';

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
const VERSION_SUMMARY_FIELDS = { version: true, title: true, editedBy: AUTHOR, editedAt: true } as const;
type Tx = Prisma.TransactionClient;

const NOT_FOUND = 'Página não encontrada';
const INVALID_PARENT = 'A página pai deve existir e estar no mesmo espaço';
const TOO_DEEP = `A hierarquia de páginas pode ter no máximo ${MAX_TREE_DEPTH} níveis`;

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
        const hierarchy = await this.hierarchyOf(tx, spaceId);
        if (!hierarchy.has(parentId)) {
          throw new BadRequestException(INVALID_PARENT);
        }
        if (depthOf(parentId, hierarchy) + 1 > MAX_TREE_DEPTH) {
          throw new BadRequestException(TOO_DEEP);
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
      select: { spaceId: true, parentId: true, title: true, content: true },
    });
    if (!current) {
      throw new NotFoundException(NOT_FOUND);
    }
    // Salvar sem mudar nada não gera versão nova: senão quem edita a página ao mesmo tempo
    // levaria um 409 por uma "alteração" que não existe
    const changed = (Object.keys(changes) as (keyof typeof changes)[]).some(
      (field) => changes[field] !== undefined && changes[field] !== current[field],
    );
    if (!changed) {
      return this.findOne(id);
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

  /** Versões anteriores da página, da mais recente para a mais antiga (sem o conteúdo). */
  async versions(id: string, query: PaginationQueryDto): Promise<Paginated<PageVersionSummaryDto>> {
    // Existência da página, página da lista e total numa única ida ao banco
    const [pageCount, data, total] = await this.prisma.$transaction([
      this.prisma.page.count({ where: { id } }),
      this.prisma.pageVersion.findMany({
        where: { pageId: id },
        select: VERSION_SUMMARY_FIELDS,
        orderBy: { version: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.pageVersion.count({ where: { pageId: id } }),
    ]);
    if (pageCount === 0) {
      throw new NotFoundException(NOT_FOUND);
    }
    return toPage(data, total, query);
  }

  /** Uma versão anterior com o conteúdo completo. */
  async version(id: string, version: number): Promise<PageVersionDto> {
    // Fora do int4 nenhuma versão existe (e a query falharia no banco com 500)
    const found =
      version >= 1 && version <= MAX_VERSION
        ? await this.prisma.pageVersion.findUnique({
            where: { pageId_version: { pageId: id, version } },
            select: { pageId: true, content: true, ...VERSION_SUMMARY_FIELDS },
          })
        : null;
    if (!found) {
      throw new NotFoundException('Versão não encontrada');
    }
    return found;
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
    // Uma query traz a hierarquia do espaço; as checagens de ciclo e profundidade rodam em memória
    const parentById = await this.hierarchyOf(tx, spaceId);
    if (!parentById.has(parentId)) {
      throw new BadRequestException(INVALID_PARENT);
    }
    if (isSelfOrDescendant(pageId, parentId, parentById)) {
      throw new BadRequestException(
        'Uma página não pode ser movida para dentro dela mesma ou de uma subpágina',
      );
    }
    // A página leva junto toda a subárvore: o nível do novo pai mais a altura dela não pode passar do teto
    if (depthOf(parentId, parentById) + subtreeHeight(pageId, parentById) > MAX_TREE_DEPTH) {
      throw new BadRequestException(TOO_DEEP);
    }
  }

  /** Pai de cada página do espaço (id → parentId), numa única query sem content. */
  private async hierarchyOf(tx: Tx, spaceId: string): Promise<Map<string, string | null>> {
    const rows = await tx.page.findMany({ where: { spaceId }, select: { id: true, parentId: true } });
    return new Map(rows.map((row) => [row.id, row.parentId]));
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
