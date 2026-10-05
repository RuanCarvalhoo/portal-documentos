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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { PaginationQueryDto } from '../common/pagination.dto';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { WriteThrottle } from '../common/throttle';
import { CreateSpaceDto } from './dto/create-space.dto';
import { PaginatedSpacesDto, SpaceDto } from './dto/space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

@ApiTags('spaces')
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  /** Lista os espaços (público, paginado) */
  @Get()
  @ApiBadRequestResponse({ description: 'Parâmetros de paginação inválidos' })
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedSpacesDto> {
    return this.spaces.findAll(query);
  }

  /** Detalha um espaço (público) */
  @Get(':id')
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  findOne(@Param('id', ParseIdPipe) id: string): Promise<SpaceDto> {
    return this.spaces.findOne(id);
  }

  /** Cria um espaço */
  @Post()
  @UseGuards(AuthGuard)
  @WriteThrottle()
  @ApiBearerAuth()
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
  create(@Body() dto: CreateSpaceDto): Promise<SpaceDto> {
    return this.spaces.create(dto);
  }

  /** Edita nome e/ou descrição de um espaço */
  @Patch(':id')
  @UseGuards(AuthGuard)
  @WriteThrottle()
  @ApiBearerAuth()
  @ApiBadRequestResponse({ description: 'Identificador ou corpo inválido' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateSpaceDto): Promise<SpaceDto> {
    return this.spaces.update(id, dto);
  }

  /** Exclui o espaço e todas as suas páginas */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @WriteThrottle()
  @ApiBearerAuth()
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
  remove(@Param('id', ParseIdPipe) id: string): Promise<void> {
    return this.spaces.remove(id);
  }
}
