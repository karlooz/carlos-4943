import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '../../../shared/storage/storage';
import type { LoginInput, RegisterInput, User } from '../auth.types';
import { authService as defaultAuthService } from '../services/authService';
import type { AuthService } from '../services/authService';
import { AuthContext } from './AuthContext';
import type { AuthContextValue } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
  service?: AuthService;
}

export function AuthProvider({ children, service = defaultAuthService }: AuthProviderProps) {
  // La sesión se restaura de LocalStorage de forma síncrona: no hay parpadeo al recargar.
  const [user, setUser] = useState<User | null>(() => service.getCurrentUser());

  // Sincroniza la sesión entre pestañas (p. ej. cerrar sesión en otra pestaña).
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEYS.session) {
        setUser(service.getCurrentUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [service]);

  const register = useCallback(
    async (input: RegisterInput) => setUser(await service.register(input)),
    [service],
  );

  const login = useCallback(
    async (input: LoginInput) => setUser(await service.login(input)),
    [service],
  );

  const logout = useCallback(() => {
    service.logout();
    setUser(null);
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, register, login, logout }),
    [user, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
