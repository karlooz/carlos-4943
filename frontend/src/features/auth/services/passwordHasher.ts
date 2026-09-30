import type { PasswordHash } from '../auth.types';

/**
 * Parámetros de derivación. OWASP recomienda >= 600,000 iteraciones para PBKDF2-HMAC-SHA256.
 * Se guardan junto al hash para poder aumentarlos en el futuro sin invalidar cuentas existentes.
 */
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 256;

const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    DERIVED_KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Comparación en tiempo constante para no filtrar información por tiempos de respuesta. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);

  return {
    algorithm: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    hash: toBase64(hash),
  };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await derive(password, fromBase64(stored.salt), stored.iterations);
  return timingSafeEqual(candidate, fromBase64(stored.hash));
}
