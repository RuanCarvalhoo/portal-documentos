import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiTags } from '@nestjs/swagger';
import { PaginatedSearchResultsDto } from './dto/search-result.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** Busca páginas por título e conteúdo (público, paginado) */
  @Get()
  @ApiBadRequestResponse({ description: 'Termo ausente, curto demais ou paginação inválida' })
  search(@Query() query: SearchQueryDto): Promise<PaginatedSearchResultsDto> {
    return this.searchService.search(query);
  }
}
