import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Paginated, PaginationQueryDto, toPage, toSkipTake } from '../common/pagination.dto';
import { orNotFound } from '../common/prisma-errors';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { SpaceDto } from './dto/space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

const SPACE_FIELDS = {
  id: true,
  name: true,
  description: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;
const NOT_FOUND = 'Espaço não encontrado';

@Injectable()
export class SpacesService {
  // Eventos de negócio no log estruturado (ADR 009): o requestId e o usuário vêm da requisição
  private readonly logger = new Logger(SpacesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<Paginated<SpaceDto>> {
    // Página e total enviados juntos em uma única ida ao banco
    const [data, total] = await this.prisma.$transaction([
      this.prisma.space.findMany({
        select: SPACE_FIELDS,
        // Ordem de criação (id é uuid v7, ordenado no tempo, como desempate estável)
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.space.count(),
    ]);
    return toPage(data, total, query);
  }

  async findOne(id: string): Promise<SpaceDto> {
    const space = await this.prisma.space.findUnique({ where: { id }, select: SPACE_FIELDS });
    if (!space) {
      throw new NotFoundException(NOT_FOUND);
    }
    return space;
  }

  async create(dto: CreateSpaceDto): Promise<SpaceDto> {
    const space = await this.prisma.space.create({ data: dto, select: SPACE_FIELDS });
    this.logger.log({ event: 'space.created', spaceId: space.id }, 'Espaço criado');
    return space;
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<SpaceDto> {
    const { version, ...changes } = dto;
    if (Object.values(changes).every((value) => value === undefined)) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }
    const current = await this.findOne(id);
    // Salvar sem mudar nada não gera versão nova: senão quem edita o espaço ao mesmo tempo
    // levaria um 409 por uma "alteração" que não existe
    const changed = (Object.keys(changes) as (keyof typeof changes)[]).some(
      (field) => changes[field] !== undefined && changes[field] !== current[field],
    );
    if (!changed) {
      return current;
    }

    try {
      // Concorrência otimista num único UPDATE ... WHERE id = ? AND version = ? RETURNING, como
      // nas páginas (ADR 005): só grava se ninguém salvou depois da versão que o cliente leu
      const space = await this.prisma.space.update({
        where: { id, version },
        data: { ...changes, version: { increment: 1 } },
        select: SPACE_FIELDS,
      });
      this.logger.log({ event: 'space.updated', spaceId: id, version: space.version }, 'Espaço atualizado');
      return space;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // Nenhuma linha casou: ou a versão ficou velha (409) ou o espaço sumiu no meio (404)
        const stillExists = (await this.prisma.space.count({ where: { id } })) > 0;
        throw stillExists
          ? new ConflictException(
              'Este espaço foi alterado por outra pessoa. Recarregue para ver a versão atual.',
            )
          : new NotFoundException(NOT_FOUND);
      }
      throw error;
    }
  }

  /** Exclui o espaço e, por ON DELETE CASCADE, todas as suas páginas. */
  async remove(id: string): Promise<void> {
    await orNotFound(this.prisma.space.delete({ where: { id }, select: { id: true } }), NOT_FOUND);
    this.logger.log({ event: 'space.deleted', spaceId: id }, 'Espaço excluído com as páginas');
  }
}
