export class UserSummaryDto {
  id: string;
  name: string;
}

export class PageDto {
  id: string;
  title: string;
  /** Markdown */
  content: string;
  spaceId: string;
  parentId: string | null;
  position: number;
  /** Envie de volta no PATCH (concorrência otimista) */
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: UserSummaryDto;
  updatedBy: UserSummaryDto;
}

export class PageTreeNodeDto {
  id: string;
  title: string;
  children: PageTreeNodeDto[];
}

export class NavigationSpaceDto {
  id: string;
  name: string;
  /** Árvore de páginas do espaço (sem conteúdo) */
  pages: PageTreeNodeDto[];
}
