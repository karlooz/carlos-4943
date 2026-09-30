import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach } from 'vitest';

// jsdom no implementa crypto.subtle; se usa la implementación Web Crypto de Node.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// Recharts (ResponsiveContainer) requiere ResizeObserver, que jsdom no incluye.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});
