import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { type AuthenticatedUser } from '../auth/auth.guard';
import { Role } from '../auth/roles';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { WriteThrottle } from '../common/throttle';
import { CreatePageDto } from './dto/create-page.dto';
import { NavigationSpaceDto, PageDto } from './dto/page.dto';
import { PageVersionDto, PaginatedPageVersionsDto } from './dto/page-version.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PagesService } from './pages.service';

const ParseVersionPipe = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('Versão inválida'),
});

@ApiTags('pages')
@Controller()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  /** Todos os espaços com suas árvores de páginas, sem conteúdo (barra lateral) */
  @Get('navigation')
  navigation(): Promise<NavigationSpaceDto[]> {
    return this.pages.navigation();
  }

  /** Cria uma página no espaço, na raiz ou sob uma página pai (Editor ou Admin) */
  @Post('spaces/:spaceId/pages')
  @Auth(Role.EDITOR)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Corpo inválido ou página pai de outro espaço' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  create(
    @Param('spaceId', ParseIdPipe) spaceId: string,
    @Body() dto: CreatePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PageDto> {
    return this.pages.create(spaceId, dto, user.id);
  }

  /** Lê uma página com conteúdo e autoria (público) */
  @Get('pages/:id')
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Página não encontrada' })
  findOne(@Param('id', ParseIdPipe) id: string): Promise<PageDto> {
    return this.pages.findOne(id);
  }

  /** Versões anteriores da página, da mais recente para a mais antiga (público, paginado) */
  @Get('pages/:id/versions')
  @ApiBadRequestResponse({ description: 'Identificador ou paginação inválidos' })
  @ApiNotFoundResponse({ description: 'Página não encontrada' })
  versions(
    @Param('id', ParseIdPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedPageVersionsDto> {
    return this.pages.versions(id, query);
  }

  /** Uma versão anterior da página, com o conteúdo completo (público) */
  @Get('pages/:id/versions/:version')
  @ApiBadRequestResponse({ description: 'Identificador ou número de versão inválido' })
  @ApiNotFoundResponse({ description: 'Versão não encontrada' })
  version(
    @Param('id', ParseIdPipe) id: string,
    @Param('version', ParseVersionPipe) version: number,
  ): Promise<PageVersionDto> {
    return this.pages.version(id, version);
  }

  /** Edita título, conteúdo e/ou página pai, informando a versão lida (Editor ou Admin) */
  @Patch('pages/:id')
  @Auth(Role.EDITOR)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Corpo inválido, pai inválido ou ciclo na hierarquia' })
  @ApiNotFoundResponse({ description: 'Página não encontrada' })
  @ApiConflictResponse({ description: 'A página foi alterada por outra pessoa (versão desatualizada)' })
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PageDto> {
    return this.pages.update(id, dto, user.id);
  }

  /** Exclui a página e todas as subpáginas (Editor ou Admin) */
  @Delete('pages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(Role.EDITOR)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Página não encontrada' })
  remove(@Param('id', ParseIdPipe) id: string): Promise<void> {
    return this.pages.remove(id);
  }
}
