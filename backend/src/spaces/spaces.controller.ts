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
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { Role } from '../auth/roles';
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

  /** Cria um espaço (Editor ou Admin) */
  @Post()
  @Auth(Role.EDITOR)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  create(@Body() dto: CreateSpaceDto): Promise<SpaceDto> {
    return this.spaces.create(dto);
  }

  /** Edita nome e/ou descrição de um espaço (Editor ou Admin) */
  @Patch(':id')
  @Auth(Role.EDITOR)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Identificador ou corpo inválido' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateSpaceDto): Promise<SpaceDto> {
    return this.spaces.update(id, dto);
  }

  /** Exclui o espaço e todas as suas páginas (só Admin: apaga uma árvore inteira) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(Role.ADMIN)
  @WriteThrottle()
  @ApiBadRequestResponse({ description: 'Identificador inválido' })
  @ApiNotFoundResponse({ description: 'Espaço não encontrado' })
  remove(@Param('id', ParseIdPipe) id: string): Promise<void> {
    return this.spaces.remove(id);
  }
}
