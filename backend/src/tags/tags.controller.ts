import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.dto';
import { PaginatedTaggedPagesDto, PaginatedTagsDto } from './dto/tag.dto';
import { ParseTagPipe } from './parse-tag.pipe';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  /** Tags em uso com a quantidade de páginas (público, paginado) */
  @Get()
  @ApiBadRequestResponse({ description: 'Parâmetros de paginação inválidos' })
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedTagsDto> {
    return this.tags.findAll(query);
  }

  /** Páginas com a tag, das editadas mais recentemente (público, paginado) */
  @Get(':name/pages')
  @ApiBadRequestResponse({ description: 'Tag ou paginação inválidas' })
  @ApiNotFoundResponse({ description: 'Nenhuma página com esta tag' })
  pages(
    @Param('name', ParseTagPipe) name: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedTaggedPagesDto> {
    return this.tags.pages(name, query);
  }
}
