// Espelho dos DTOs da API (backend/src/**/dto)

export interface UserSummary {
  id: string;
  name: string;
}

/** Perfil de acesso (ADR 012): conta nova é READER; EDITOR escreve; ADMIN também administra */
export type Role = 'ADMIN' | 'EDITOR' | 'READER';

export interface AuthUser extends UserSummary {
  email: string;
  role: Role;
}

/** Conta na gestão de perfis (GET /users, só Admin) */
export interface ManagedUser extends AuthUser {
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TreeNode {
  id: string;
  title: string;
  children: TreeNode[];
}

export interface NavigationSpace {
  id: string;
  name: string;
  pages: TreeNode[];
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  spaceId: string;
  parentId: string | null;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  updatedBy: UserSummary;
  /** Normalizadas e em ordem alfabética */
  tags: string[];
}

/** Versão anterior de uma página (o histórico guarda o texto substituído a cada edição) */
export interface PageVersionSummary {
  version: number;
  title: string;
  editedBy: UserSummary;
  editedAt: string;
}

export interface PageVersion extends PageVersionSummary {
  pageId: string;
  content: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface SearchResult {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  snippet: string;
  updatedAt: string;
}

export interface TagSummary {
  name: string;
  pageCount: number;
}

export interface TaggedPage {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  updatedAt: string;
  tags: string[];
}

/** Resposta do POST /uploads; no Markdown a imagem fica em `/api` + path */
export interface UploadedImage {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
}
