import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { FIXED_NOW, buildChargeBody, buildConfig } from './helpers.js';

const PAYMENTS_URL = '/api/snailpay/payments';

const buildApp = (outage = false, sleep = vi.fn(() => Promise.resolve())) =>
  createApp({ config: buildConfig({ simulateOutage: outage }), sleep, now: () => FIXED_NOW });

const CONTRACT_FIELDS = [
  'id',
  'status',
  'status_detail',
  'transaction_amount',
  'date_created',
  'authorization_code',
  'reference',
  'payer_id',
  'payer_email',
  'card_number',
  'cvv',
];

describe('POST /api/snailpay/payments', () => {
  it('201 con cobro aprobado y todos los campos del contrato', async () => {
    const response = await request(buildApp()).post(PAYMENTS_URL).send(buildChargeBody());

    expect(response.status).toBe(201);
    expect(Object.keys(response.body)).toEqual(expect.arrayContaining(CONTRACT_FIELDS));
    expect(response.body.status).toBe('approved');
  });

  it('402 cuando la tarjeta es rechazada', async () => {
    const response = await request(buildApp())
      .post(PAYMENTS_URL)
      .send(buildChargeBody({ card_number: '4000000000000002' }));

    expect(response.status).toBe(402);
    expect(response.body.status_detail).toBe('cc_rejected_insufficient_funds');
  });

  it('400 con la lista de errores de validación', async () => {
    const response = await request(buildApp())
      .post(PAYMENTS_URL)
      .send(buildChargeBody({ cvv: '1', transaction_amount: -1 }));

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'cvv' }),
        expect.objectContaining({ field: 'transaction_amount' }),
      ]),
    );
  });

  it('503 cuando SNAILPAY_SIMULATE_OUTAGE está activo, incluso con la tarjeta aprobada', async () => {
    const response = await request(buildApp(true)).post(PAYMENTS_URL).send(buildChargeBody());

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.authorization_code).toBeNull();
  });

  it('504 tras esperar el retardo configurado en el escenario de timeout', async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const response = await request(buildApp(false, sleep))
      .post(PAYMENTS_URL)
      .send(buildChargeBody({ card_number: '5000000000000019' }));

    expect(sleep).toHaveBeenCalledOnce();
    expect(response.status).toBe(504);
  });

  it('400 cuando el JSON está mal formado', async () => {
    const response = await request(buildApp())
      .post(PAYMENTS_URL)
      .set('Content-Type', 'application/json')
      .send('{"card_number":');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_json');
  });
});

describe('rutas generales', () => {
  it('GET /api/health responde ok', async () => {
    const response = await request(buildApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('404 en rutas inexistentes', async () => {
    const response = await request(buildApp()).get('/api/no-existe');

    expect(response.status).toBe(404);
  });
});
