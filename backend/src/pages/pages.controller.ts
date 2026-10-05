import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { WriteThrottle } from '../common/throttle';
import { CreatePageDto } from './dto/create-page.dto';
import { NavigationSpaceDto, PageDto } from './dto/page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PagesService } from './pages.service';

const UNAUTHORIZED = { description: 'Token ausente, inválido ou expirado' };

@ApiTags('pages')
@Controller()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  /** Todos os espaços com suas árvores de páginas, sem conteúdo (barra lateral) */
  @Get('navigation')
  navigation(): Promise<NavigationSpaceDto[]> {
    return this.pages.navigation();
  }

  /** Cria uma página no espaço, na raiz ou sob uma página pai */
  @Post('spaces/:spaceId/pages')
  @UseGuards(AuthGuard)
  @WriteThrottle()
  @ApiBearerAuth()
  @ApiBadRequestResponse({ description: 'Corpo inválido ou página pai de outro espaço' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  @ApiUnauthorizedResponse(UNAUTHORIZED)
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

  /** Edita título, conteúdo e/ou página pai, informando a versão lida */
  @Patch('pages/:id')
  @UseGuards(AuthGuard)
  @WriteThrottle()
  @ApiBearerAuth()
  @ApiBadRequestResponse({ description: 'Corpo inválido, pai inválido ou ciclo na hierarquia' })
  @ApiNotFoundResponse({ description: 'Página não encontrada' })
  @ApiConflictResponse({ description: 'A página foi alterada por outra pessoa (versão desatualizada)' })
  @ApiUnauthorizedResponse(UNAUTHORIZED)
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PageDto> {
    return this.pages.update(id, dto, user.id);
  }

  /** Exclui a página e todas as subpáginas */
  @Delete('pages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @WriteThrottle()
  @ApiBearerAuth()
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Página não encontrada' })
  @ApiUnauthorizedResponse(UNAUTHORIZED)
  remove(@Param('id', ParseIdPipe) id: string): Promise<void> {
    return this.pages.remove(id);
  }
}
