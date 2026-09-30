import type { ZodType } from 'zod';

/** Todas las llaves de LocalStorage usadas por la aplicación, en un solo lugar. */
export const STORAGE_KEYS = {
  users: 'caracolandia:users',
  session: 'caracolandia:session',
  wallets: 'caracolandia:wallets',
  transactions: 'caracolandia:transactions',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Lee un valor JSON y lo valida contra un esquema. Si el valor no existe, está corrupto
 * o fue manipulado a mano con una forma inválida, se devuelve el valor por defecto.
 */
export function readJson<T>(key: StorageKey, schema: ZodType<T>, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: StorageKey, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: StorageKey): void {
  window.localStorage.removeItem(key);
}
