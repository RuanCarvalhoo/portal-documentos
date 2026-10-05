import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '../auth/roles';
import { PaginationQueryDto } from '../common/pagination.dto';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { WriteThrottle } from '../common/throttle';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginatedUsersDto, UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Lista as contas com seus perfis (só Admin, paginado) */
  @Get()
  @Auth(Role.ADMIN)
  @ApiBadRequestResponse({ description: 'Parâmetros de paginação inválidos' })
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedUsersDto> {
    return this.users.findAll(query);
  }

  /** Troca o perfil de uma conta (só Admin) */
  @Patch(':id/role')
  @Auth(Role.ADMIN)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Identificador ou perfil inválido' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'Rebaixaria a única conta Admin' })
  updateRole(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserDto> {
    return this.users.updateRole(id, dto.role, actor.id);
  }
}
