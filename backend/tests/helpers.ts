import type { AppConfig } from '../src/config/env.js';

export const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z');

export const buildConfig = (overrides: Partial<AppConfig['snailPay']> = {}): AppConfig => ({
  nodeEnv: 'test',
  port: 0,
  corsOrigins: ['http://localhost:5173'],
  snailPay: { simulateOutage: false, timeoutDelayMs: 0, ...overrides },
});

/** Cuerpo válido que produce un cobro aprobado. Cada prueba sobreescribe lo que necesita. */
export const buildChargeBody = (overrides: Record<string, unknown> = {}) => ({
  card_number: '1234123412341234',
  expiration_date: '12/26',
  cvv: '543',
  cardholder_name: 'Ana Pérez',
  transaction_amount: 250.5,
  payer_id: 'b1f0c2a4-0000-4000-8000-000000000001',
  payer_email: 'ana@example.com',
  ...overrides,
});
