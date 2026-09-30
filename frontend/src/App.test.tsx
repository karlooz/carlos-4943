import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { AuthProvider } from './features/auth/context/AuthProvider';
import { createAuthService } from './features/auth/services/authService';
import type { AuthService } from './features/auth/services/authService';

const renderApp = (
  initialPath: string,
  service: AuthService = createAuthService({ hashIterations: 1_000 }),
) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider service={service}>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

async function registerUser(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
  await user.type(screen.getByLabelText('Contraseña'), 'Secreta123');
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'Secreta123');
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

describe('flujo de autenticación', () => {
  it('redirige al login si se intenta abrir el dashboard sin sesión', () => {
    renderApp('/dashboard');

    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });

  it('muestra errores de validación sin registrar al usuario', async () => {
    const user = userEvent.setup();
    renderApp('/registro');

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('El nombre debe tener al menos 3 caracteres'),
    ).toBeInTheDocument();
    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Hola/ })).not.toBeInTheDocument();
  });

  it('registra, muestra el dashboard con saldo $0, cierra sesión e inicia sesión de nuevo', async () => {
    const user = userEvent.setup();
    renderApp('/registro');

    await registerUser(user);

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
    expect(screen.getByTestId('balance')).toHaveTextContent('$0.00');
    expect(screen.getByRole('region', { name: 'Mis apuestas del día' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Victorias por caracol' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Secreta123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument();
  });

  it('informa credenciales incorrectas con un mensaje genérico', async () => {
    const user = userEvent.setup();
    const service = createAuthService({ hashIterations: 1_000 });
    await service.register({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'Secreta123',
    });
    service.logout();
    renderApp('/login', service);

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Incorrecta1');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
  });

  it('mantiene la sesión al "recargar" la aplicación', async () => {
    const service = createAuthService({ hashIterations: 1_000 });
    await service.register({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'Secreta123',
    });

    renderApp('/login', service);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Hola, Ana/ })).toBeInTheDocument(),
    );
  });
});
