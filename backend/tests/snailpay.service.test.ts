import { describe, expect, it } from 'vitest';
import { createSnailPayService, isCardExpired } from '../src/modules/snailpay/snailpay.service.js';
import { FIXED_NOW, buildChargeBody } from './helpers.js';

const createService = (simulateOutage = false) =>
  createSnailPayService({
    simulateOutage,
    now: () => FIXED_NOW,
    generateId: () => 'abcdef12-3456',
  });

describe('SnailPay service', () => {
  describe('cobro exitoso', () => {
    it('aprueba la tarjeta de prueba documentada y devuelve el contrato completo', () => {
      const outcome = createService().processCharge(buildChargeBody());

      expect(outcome.httpStatus).toBe(201);
      expect(outcome.body).toMatchObject({
        id: 'abcdef12-3456',
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 250.5,
        date_created: FIXED_NOW.toISOString(),
        reference: 'SP-20260615-ABCDEF12',
        payer_id: 'b1f0c2a4-0000-4000-8000-000000000001',
        payer_email: 'ana@example.com',
        card_number: '1234123412341234',
        cvv: '543',
      });
      expect(outcome.body.authorization_code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('aprueba la tarjeta documentada aunque el reloj ya haya pasado su vencimiento', () => {
      const service = createSnailPayService({
        simulateOutage: false,
        now: () => new Date('2030-01-01T00:00:00.000Z'),
      });

      expect(service.processCharge(buildChargeBody()).body.status).toBe('approved');
    });
  });

  describe('errores de transacción', () => {
    it.each([
      ['CVV incorrecto', { cvv: '999' }, 'cc_rejected_bad_security_code'],
      [
        'vencimiento distinto al registrado',
        { expiration_date: '11/29' },
        'cc_rejected_bad_expiration_date',
      ],
      [
        'tarjeta vencida',
        { card_number: '4111111111111111', expiration_date: '01/24' },
        'cc_rejected_card_expired',
      ],
      [
        'fondos insuficientes',
        { card_number: '4000000000000002' },
        'cc_rejected_insufficient_funds',
      ],
      ['alto riesgo', { card_number: '4000000000000119' }, 'cc_rejected_high_risk'],
      [
        'monto sobre el límite',
        { transaction_amount: 10_000.01 },
        'cc_rejected_amount_limit_exceeded',
      ],
      ['tarjeta desconocida', { card_number: '4111111111111111' }, 'cc_rejected_card_declined'],
    ])('rechaza con 402 por %s', (_scenario, overrides, expectedDetail) => {
      const outcome = createService().processCharge(buildChargeBody(overrides));

      expect(outcome.httpStatus).toBe(402);
      expect(outcome.body.status).toBe('rejected');
      expect(outcome.body.status_detail).toBe(expectedDetail);
      expect(outcome.body.authorization_code).toBeNull();
    });

    it.each([
      [{ card_number: '1234' }, 'invalid_card_number'],
      [{ expiration_date: '13/26' }, 'invalid_expiration_date'],
      [{ cvv: '12a' }, 'invalid_security_code'],
      [{ cardholder_name: '   ' }, 'invalid_cardholder_name'],
      [{ transaction_amount: 0 }, 'invalid_amount'],
      [{ transaction_amount: -5 }, 'invalid_amount'],
      [{ transaction_amount: 10.123 }, 'invalid_amount'],
      [{ transaction_amount: '100' }, 'invalid_amount'],
      [{ payer_email: 'no-es-correo' }, 'invalid_payer'],
      [{ payer_id: '' }, 'invalid_payer'],
    ])('rechaza con 400 datos inválidos %o', (overrides, expectedDetail) => {
      const outcome = createService().processCharge(buildChargeBody(overrides));

      expect(outcome.httpStatus).toBe(400);
      expect(outcome.body.status).toBe('rejected');
      expect(outcome.body.status_detail).toBe(expectedDetail);
      expect(outcome.body.errors?.length).toBeGreaterThan(0);
      expect(outcome.body.authorization_code).toBeNull();
    });

    it('devuelve todos los campos del contrato aun con un cuerpo vacío', () => {
      const outcome = createService().processCharge(undefined);

      expect(outcome.httpStatus).toBe(400);
      expect(outcome.body).toMatchObject({
        status: 'rejected',
        transaction_amount: null,
        payer_id: null,
        payer_email: null,
        card_number: null,
        cvv: null,
      });
    });
  });

  describe('errores del sistema', () => {
    it('responde 503 y nunca aprueba cuando la caída está simulada por configuración', () => {
      const outcome = createService(true).processCharge(buildChargeBody());

      expect(outcome.httpStatus).toBe(503);
      expect(outcome.body.status).toBe('error');
      expect(outcome.body.status_detail).toBe('snailpay_service_unavailable');
      expect(outcome.body.authorization_code).toBeNull();
    });

    it('responde 503 con la tarjeta de prueba de error del sistema', () => {
      const outcome = createService().processCharge(
        buildChargeBody({ card_number: '5000000000000001' }),
      );

      expect(outcome.httpStatus).toBe(503);
      expect(outcome.body.status).toBe('error');
    });

    it('marca la tarjeta de timeout para responder con retraso y estado 504', () => {
      const outcome = createService().processCharge(
        buildChargeBody({ card_number: '5000000000000019' }),
      );

      expect(outcome.simulateTimeout).toBe(true);
      expect(outcome.httpStatus).toBe(504);
      expect(outcome.body.status_detail).toBe('snailpay_processing_timeout');
    });
  });
});

describe('isCardExpired', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it.each([
    ['05/26', true],
    ['06/26', false],
    ['07/26', false],
    ['12/25', true],
  ])('%s -> vencida: %s', (expiration, expected) => {
    expect(isCardExpired(expiration, now)).toBe(expected);
  });
});
