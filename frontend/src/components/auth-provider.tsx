'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import type { AuthResponse, AuthUser } from '@/lib/types';

// Trade-off documentado (ADR 004): token em localStorage, mitigado por Markdown sem HTML cru
const TOKEN_KEY = 'portal-docs:token';
// Com a API pendurada, a sessão não pode ficar em "Carregando..." para sempre
const ME_TIMEOUT_MS = 10_000;
const RESTORE_RETRY_DELAY_MS = 1_500;

const fetchProfile = (token: string) => apiFetch<AuthUser>('/auth/me', { token, timeoutMs: ME_TIMEOUT_MS });

// Falha transitória (rede, API reiniciando, aba lenta durante a hidratação) não pode deixar a aba
// "deslogada" com um token válido salvo: tenta mais uma vez. Só um 401 encerra a sessão.
async function fetchProfileWithRetry(token: string): Promise<AuthUser> {
  try {
    return await fetchProfile(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY_MS));
    return fetchProfile(token);
  }
}

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
      ? fetchProfileWithRetry(saved).then(
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

  // Login feito em outra aba (por exemplo, depois de a sessão expirar no meio de uma edição):
  // esta aba assume o novo token sem recarregar, e o texto do editor continua onde estava.
  // Logout em outra aba não derruba esta: desmontaria um formulário com alterações não salvas.
  useEffect(() => {
    const adoptLoginFromOtherTab = (event: StorageEvent) => {
      const fresh = event.key === TOKEN_KEY ? event.newValue : null;
      if (!fresh) {
        return;
      }
      fetchProfile(fresh).then(
        (profile) => {
          setToken(fresh);
          setUser(profile);
        },
        // Token recusado ou API fora: mantém a sessão atual desta aba
        () => undefined,
      );
    };
    window.addEventListener('storage', adoptLoginFromOtherTab);
    return () => window.removeEventListener('storage', adoptLoginFromOtherTab);
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
