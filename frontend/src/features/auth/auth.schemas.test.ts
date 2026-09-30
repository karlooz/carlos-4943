import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth.schemas';

const VALID = {
  fullName: 'María José Núñez',
  email: 'maria@example.com',
  password: 'Caracol123',
  confirmPassword: 'Caracol123',
};

const errorPaths = (input: unknown) => {
  const result = registerSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('registerSchema', () => {
  it('acepta un registro válido (incluye acentos en el nombre)', () => {
    expect(registerSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    ['nombre muy corto', { fullName: 'Al' }, 'fullName'],
    ['nombre con números', { fullName: 'Ana 123' }, 'fullName'],
    ['correo inválido', { email: 'maria@' }, 'email'],
    [
      'contraseña sin mayúscula',
      { password: 'caracol123', confirmPassword: 'caracol123' },
      'password',
    ],
    ['contraseña sin número', { password: 'Caracoles', confirmPassword: 'Caracoles' }, 'password'],
    ['contraseña corta', { password: 'Ca1', confirmPassword: 'Ca1' }, 'password'],
    ['confirmación distinta', { confirmPassword: 'Caracol124' }, 'confirmPassword'],
  ])('rechaza %s', (_case, overrides, expectedPath) => {
    expect(errorPaths({ ...VALID, ...overrides })).toContain(expectedPath);
  });
});
