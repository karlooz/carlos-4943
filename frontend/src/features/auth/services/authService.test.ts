import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../shared/storage/storage';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  createAuthService,
} from './authService';

const NEW_USER = { fullName: 'Ana Pérez', email: 'Ana@Example.com ', password: 'Secreta123' };

const createService = (now = () => new Date('2026-09-28T10:00:00Z')) =>
  createAuthService({ hashIterations: 1_000, sessionDurationMs: 60 * 60 * 1000, now });

describe('authService', () => {
  it('registra al usuario, normaliza el correo e inicia sesión', async () => {
    const service = createService();
    const user = await service.register(NEW_USER);

    expect(user).toMatchObject({ fullName: 'Ana Pérez', email: 'ana@example.com' });
    expect(user).not.toHaveProperty('password');
    expect(service.getCurrentUser()?.id).toBe(user.id);
  });

  it('guarda solo el hash de la contraseña en LocalStorage', async () => {
    await createService().register(NEW_USER);
    const rawUsers = window.localStorage.getItem(STORAGE_KEYS.users) ?? '';

    expect(rawUsers).not.toContain(NEW_USER.password);
    expect(rawUsers).toContain('PBKDF2-SHA256');
  });

  it('no permite registrar dos veces el mismo correo', async () => {
    const service = createService();
    await service.register(NEW_USER);

    await expect(
      service.register({ ...NEW_USER, email: 'ANA@example.com' }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('cierra sesión y permite volver a iniciarla con las mismas credenciales', async () => {
    const service = createService();
    const registered = await service.register(NEW_USER);

    service.logout();
    expect(service.getCurrentUser()).toBeNull();

    const loggedIn = await service.login({ email: 'ana@example.com', password: 'Secreta123' });
    expect(loggedIn.id).toBe(registered.id);
    expect(service.getCurrentUser()?.id).toBe(registered.id);
  });

  it.each([
    ['contraseña incorrecta', 'ana@example.com', 'Otra1234'],
    ['correo inexistente', 'nadie@example.com', 'Secreta123'],
  ])('rechaza el login con %s usando un mensaje genérico', async (_case, email, password) => {
    const service = createService();
    await service.register(NEW_USER);
    service.logout();

    await expect(service.login({ email, password })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(service.getCurrentUser()).toBeNull();
  });

  it('conserva la sesión entre instancias (equivalente a recargar la página)', async () => {
    const user = await createService().register(NEW_USER);

    expect(createService().getCurrentUser()?.id).toBe(user.id);
  });

  it('invalida la sesión expirada', async () => {
    await createService().register(NEW_USER);
    const twoHoursLater = () => new Date('2026-09-28T12:00:00Z');

    expect(createService(twoHoursLater).getCurrentUser()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
  });

  it('ignora datos corruptos en LocalStorage en lugar de fallar', () => {
    window.localStorage.setItem(STORAGE_KEYS.session, '{no es json');

    expect(createService().getCurrentUser()).toBeNull();
  });
});
