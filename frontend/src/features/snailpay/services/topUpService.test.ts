import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../shared/storage/storage';
import { buildPayment, CHARGE_REQUEST, TEST_USER } from '../../../test/fixtures';
import { getBalanceCents, getTransactions } from '../../wallet/services/walletService';
import type { SnailPayClient } from '../api/snailpayClient';
import type { ChargeAttempt } from '../snailpay.types';
import { performTopUp } from './topUpService';

const INPUT = {
  cardNumber: CHARGE_REQUEST.cardNumber,
  expirationDate: CHARGE_REQUEST.expirationDate,
  cvv: CHARGE_REQUEST.cvv,
  cardholderName: CHARGE_REQUEST.cardholderName,
  amount: CHARGE_REQUEST.amount,
};

const clientReturning = (attempt: ChargeAttempt): SnailPayClient => ({
  charge: vi.fn().mockResolvedValue(attempt),
});

describe('performTopUp', () => {
  it('acredita el saldo y guarda la operación (incluye tarjeta y CVV) cuando se aprueba', async () => {
    const payment = buildPayment();
    const result = await performTopUp(
      clientReturning({ kind: 'response', httpStatus: 201, payment }),
      TEST_USER,
      INPUT,
    );

    expect(result.kind).toBe('approved');
    expect(getBalanceCents(TEST_USER.id)).toBe(15050);
    expect(getTransactions(TEST_USER.id)[0]).toMatchObject({
      card_number: '1234123412341234',
      cvv: '543',
    });
  });

  it('acumula recargas sucesivas', async () => {
    await performTopUp(
      clientReturning({ kind: 'response', httpStatus: 201, payment: buildPayment({ id: 'a' }) }),
      TEST_USER,
      INPUT,
    );
    await performTopUp(
      clientReturning({ kind: 'response', httpStatus: 201, payment: buildPayment({ id: 'b' }) }),
      TEST_USER,
      INPUT,
    );

    expect(getBalanceCents(TEST_USER.id)).toBe(30100);
  });

  it('no acredita dos veces la misma operación', async () => {
    const attempt: ChargeAttempt = { kind: 'response', httpStatus: 201, payment: buildPayment() };
    await performTopUp(clientReturning(attempt), TEST_USER, INPUT);
    await performTopUp(clientReturning(attempt), TEST_USER, INPUT);

    expect(getBalanceCents(TEST_USER.id)).toBe(15050);
  });

  it.each<[string, ChargeAttempt, string]>([
    [
      'tarjeta rechazada',
      {
        kind: 'response',
        httpStatus: 402,
        payment: buildPayment({
          status: 'rejected',
          status_detail: 'cc_rejected_insufficient_funds',
          authorization_code: null,
        }),
      },
      'rejected',
    ],
    [
      'error del sistema',
      {
        kind: 'response',
        httpStatus: 503,
        payment: buildPayment({
          status: 'error',
          status_detail: 'snailpay_service_unavailable',
          authorization_code: null,
        }),
      },
      'system_error',
    ],
    ['timeout', { kind: 'timeout' }, 'timeout'],
    ['error de red', { kind: 'network_error' }, 'network_error'],
    ['respuesta sin contrato', { kind: 'invalid_response', httpStatus: 200 }, 'system_error'],
    [
      '"approved" con HTTP distinto de 201',
      { kind: 'response', httpStatus: 200, payment: buildPayment() },
      'system_error',
    ],
    [
      '"approved" con monto distinto al solicitado',
      { kind: 'response', httpStatus: 201, payment: buildPayment({ transaction_amount: 9_999 }) },
      'system_error',
    ],
    [
      '"approved" para otro pagador',
      { kind: 'response', httpStatus: 201, payment: buildPayment({ payer_id: 'otro' }) },
      'system_error',
    ],
    [
      '"approved" sin código de autorización',
      { kind: 'response', httpStatus: 201, payment: buildPayment({ authorization_code: null }) },
      'system_error',
    ],
  ])('no modifica el saldo ante %s', async (_case, attempt, expectedKind) => {
    const result = await performTopUp(clientReturning(attempt), TEST_USER, INPUT);

    expect(result.kind).toBe(expectedKind);
    expect(result.message.length).toBeGreaterThan(0);
    expect(getBalanceCents(TEST_USER.id)).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEYS.wallets)).toBeNull();
  });

  it('muestra un mensaje específico según status_detail', async () => {
    const result = await performTopUp(
      clientReturning({
        kind: 'response',
        httpStatus: 402,
        payment: buildPayment({
          status: 'rejected',
          status_detail: 'cc_rejected_bad_security_code',
          authorization_code: null,
        }),
      }),
      TEST_USER,
      INPUT,
    );

    expect(result.message).toMatch(/CVV/);
  });
});
