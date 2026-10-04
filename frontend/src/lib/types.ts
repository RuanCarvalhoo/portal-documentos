// Espelho dos DTOs da API (backend/src/**/dto)

export interface UserSummary {
  id: string;
  name: string;
}

export interface AuthUser extends UserSummary {
  email: string;
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
