import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../context/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}

/** Para pantallas protegidas: garantiza que existe un usuario autenticado. */
export function useAuthenticatedUser() {
  const { user, ...rest } = useAuth();
  if (!user) {
    throw new Error('useAuthenticatedUser requiere una sesión activa (usa <ProtectedRoute>).');
  }
  return { user, ...rest };
}
