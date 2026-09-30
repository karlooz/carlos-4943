import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../../../routes';
import { useAuth } from '../hooks/useAuth';

/** Solo deja pasar si hay una sesión activa; de lo contrario redirige a /login. */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Evita que un usuario autenticado vuelva a ver login/registro. */
export function PublicOnlyRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <Outlet />;
}
