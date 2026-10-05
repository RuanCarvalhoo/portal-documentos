import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role } from '../auth/roles';
import { Paginated, PaginationQueryDto, toPage, toSkipTake } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dto/user.dto';

// select explícito: o hash da senha nunca sai do banco
const USER_FIELDS = { id: true, name: true, email: true, role: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<Paginated<UserDto>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: USER_FIELDS,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.user.count(),
    ]);
    return toPage(data, total, query);
  }

  /**
   * Troca o perfil de uma conta. O portal nunca fica sem Admin: rebaixar o último responde 409.
   * Os Admins ficam travados (FOR UPDATE) durante a checagem: dois Admins rebaixando um ao outro
   * ao mesmo tempo entram em fila, e o segundo já vê o resultado do primeiro.
   */
  async updateRole(id: string, role: Role, actorId: string): Promise<UserDto> {
    const { user, previous } = await this.prisma.$transaction(async (tx) => {
      const admins = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM users WHERE role = 'admin' FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id }, select: { role: true } });
      if (!current) {
        throw new NotFoundException('Usuário não encontrado');
      }
      if (current.role === Role.ADMIN && role !== Role.ADMIN && admins.length <= 1) {
        throw new ConflictException('Esta é a única conta Admin: promova outra conta antes de rebaixá-la');
      }
      const updated = await tx.user.update({ where: { id }, data: { role }, select: USER_FIELDS });
      return { user: updated, previous: current.role };
    });
    if (previous !== role) {
      // Trilha de auditoria: quem mudou o perfil de quem, de quê para quê
      this.logger.log(
        { event: 'user.role_changed', userId: id, from: previous, to: role, changedBy: actorId },
        'Perfil alterado',
      );
    }
    return user;
  }
}
