'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import type { AuthResponse, AuthUser } from '@/lib/types';

// Trade-off documentado (ADR 004): token em localStorage, mitigado por Markdown sem HTML cru
const TOKEN_KEY = 'portal-docs:token';

// Armazenamento bloqueado (modo privado, política do navegador) não pode derrubar a aplicação
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // A sessão vale só enquanto a aba estiver aberta
  }
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** false até descobrir se há sessão salva (evita piscar "Entrar" para quem está logado) */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const saveSession = useCallback(({ accessToken, user: profile }: AuthResponse) => {
    writeToken(accessToken);
    setToken(accessToken);
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const saved = readToken();
    // Login/logout durante a validação mudam o token salvo: aí o resultado antigo é descartado
    const stillCurrent = () => readToken() === saved;
    // Token salvo pode ter expirado: confirma com a API antes de considerar logado
    const restore = saved
      ? apiFetch<AuthUser>('/auth/me', { token: saved }).then(
          (profile) => {
            if (stillCurrent()) {
              setToken(saved);
              setUser(profile);
            }
          },
          (error: unknown) => {
            // Só descarta a sessão se a API recusou o token; erro de rede não desloga ninguém
            if (error instanceof ApiError && error.status === 401 && stillCurrent()) {
              writeToken(null);
            }
          },
        )
      : Promise.resolve();
    void restore.finally(() => setReady(true));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      saveSession(await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }));
    },
    [saveSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      saveSession(
        await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } }),
      );
    },
    [saveSession],
  );

  const value = useMemo(
    () => ({ user, token, ready, login, register, logout }),
    [user, token, ready, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return context;
}
