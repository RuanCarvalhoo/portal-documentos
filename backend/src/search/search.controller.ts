import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PaginatedSearchResultsDto } from './dto/search-result.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** Busca páginas por título e conteúdo (público, paginado) */
  @Get()
  // Rota pública e cara (ILIKE em todo o conteúdo): limite por IP para não esgotar o pool do banco
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiTooManyRequestsResponse({ description: 'Muitas buscas em pouco tempo' })
  @ApiBadRequestResponse({ description: 'Termo ausente, curto demais ou paginação inválida' })
  search(@Query() query: SearchQueryDto): Promise<PaginatedSearchResultsDto> {
    return this.searchService.search(query);
  }
}
