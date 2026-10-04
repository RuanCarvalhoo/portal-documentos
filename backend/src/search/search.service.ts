import { Injectable } from '@nestjs/common';
import { Paginated, toPage, toSkipTake } from '../common/pagination.dto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { buildSnippet } from './snippet.util';

// O Prisma não escapa os curingas do LIKE: sem isto, "a_b" acharia "axb" e "%" casaria tudo.
// A barra invertida é o caractere de escape padrão do LIKE no Postgres.
export function escapeLikeWildcards(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto): Promise<Paginated<SearchResultDto>> {
    // contains + insensitive vira ILIKE '%termo%', atendido pelos índices GIN trigram de
    // title e content (ADR 003). O termo vai como parâmetro da query, nunca concatenado.
    const term = escapeLikeWildcards(query.q);
    const where = {
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ],
    } satisfies Prisma.PageWhereInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          spaceId: true,
          updatedAt: true,
          space: { select: { name: true } },
        },
        // Sempre com ORDER BY: só com LIMIT o planner preferiu seq scan aos índices GIN
        // (medido com 20 mil páginas: 3,4 s contra 34 ms)
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.page.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      spaceId: row.spaceId,
      spaceName: row.space.name,
      snippet: buildSnippet(row.content, query.q),
      updatedAt: row.updatedAt,
    }));
    return toPage(data, total, query);
  }
}
