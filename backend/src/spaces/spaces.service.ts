import { Injectable, NotFoundException } from '@nestjs/common';
import { Paginated, PaginationQueryDto, toSkipTake } from '../common/pagination.dto';
import { orNotFound } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { SpaceDto } from './dto/space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

const SPACE_FIELDS = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;
const NOT_FOUND = 'Espaço não encontrado';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<Paginated<SpaceDto>> {
    // Página e total na mesma transação: os dois enxergam o mesmo estado da tabela
    const [data, total] = await this.prisma.$transaction([
      this.prisma.space.findMany({
        select: SPACE_FIELDS,
        // Ordem de criação (id é uuid v7, ordenado no tempo, como desempate estável)
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.space.count(),
    ]);
    return { data, meta: { total, page: query.page, limit: query.limit } };
  }

  async findOne(id: string): Promise<SpaceDto> {
    const space = await this.prisma.space.findUnique({ where: { id }, select: SPACE_FIELDS });
    if (!space) {
      throw new NotFoundException(NOT_FOUND);
    }
    return space;
  }

  create(dto: CreateSpaceDto): Promise<SpaceDto> {
    return this.prisma.space.create({ data: dto, select: SPACE_FIELDS });
  }

  update(id: string, dto: UpdateSpaceDto): Promise<SpaceDto> {
    return orNotFound(
      this.prisma.space.update({ where: { id }, data: dto, select: SPACE_FIELDS }),
      NOT_FOUND,
    );
  }

  /** Exclui o espaço e, por ON DELETE CASCADE, todas as suas páginas. */
  async remove(id: string): Promise<void> {
    await orNotFound(this.prisma.space.delete({ where: { id }, select: { id: true } }), NOT_FOUND);
  }
}
