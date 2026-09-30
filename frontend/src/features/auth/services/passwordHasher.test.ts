import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwordHasher';

// Iteraciones bajas solo para que las pruebas sean rápidas; en la app se usan 600,000.
const TEST_ITERATIONS = 1_000;

describe('passwordHasher', () => {
  it('nunca guarda la contraseña en texto plano', async () => {
    const stored = await hashPassword('Secreta123', TEST_ITERATIONS);

    expect(JSON.stringify(stored)).not.toContain('Secreta123');
    expect(stored).toMatchObject({ algorithm: 'PBKDF2-SHA256', iterations: TEST_ITERATIONS });
  });

  it('verifica la contraseña correcta y rechaza una incorrecta', async () => {
    const stored = await hashPassword('Secreta123', TEST_ITERATIONS);

    await expect(verifyPassword('Secreta123', stored)).resolves.toBe(true);
    await expect(verifyPassword('secreta123', stored)).resolves.toBe(false);
    await expect(verifyPassword('', stored)).resolves.toBe(false);
  });

  it('usa una sal aleatoria: la misma contraseña produce hashes distintos', async () => {
    const first = await hashPassword('Secreta123', TEST_ITERATIONS);
    const second = await hashPassword('Secreta123', TEST_ITERATIONS);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });
});
