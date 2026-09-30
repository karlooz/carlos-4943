import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { PublicOnlyRoute, ProtectedRoute } from './features/auth/components/RouteGuards';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ROUTES } from './routes';

// El dashboard (y la librería de gráficas) se carga bajo demanda: login/registro pesan menos.
const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

function PageLoader() {
  return (
    <div className="page-loader" role="status">
      Cargando...
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </Suspense>
  );
}
