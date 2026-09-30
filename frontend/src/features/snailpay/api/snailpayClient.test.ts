import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPayment, CHARGE_REQUEST } from '../../../test/fixtures';
import { createSnailPayClient } from './snailpayClient';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.useRealTimers();
});

describe('snailPayClient', () => {
  it('envía el cuerpo en snake_case al endpoint de pagos', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(201, buildPayment()));
    await createSnailPayClient({ baseUrl: 'http://api.test', fetchFn }).charge(CHARGE_REQUEST);

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/api/snailpay/payments');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      card_number: CHARGE_REQUEST.cardNumber,
      transaction_amount: CHARGE_REQUEST.amount,
      payer_id: CHARGE_REQUEST.payerId,
      payer_email: CHARGE_REQUEST.payerEmail,
    });
  });

  it.each([201, 402, 400, 503])('devuelve la respuesta tipada con HTTP %i', async (status) => {
    const payment = buildPayment({ status: status === 201 ? 'approved' : 'rejected' });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(status, payment));

    const attempt = await createSnailPayClient({ fetchFn }).charge(CHARGE_REQUEST);

    expect(attempt).toEqual({ kind: 'response', httpStatus: status, payment });
  });

  it('marca como inválida una respuesta que no cumple el contrato', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(201, { status: 'approved' }));

    const attempt = await createSnailPayClient({ fetchFn }).charge(CHARGE_REQUEST);

    expect(attempt).toEqual({ kind: 'invalid_response', httpStatus: 201 });
  });

  it('marca como inválida una respuesta que no es JSON (p. ej. un proxy caído)', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const attempt = await createSnailPayClient({ fetchFn }).charge(CHARGE_REQUEST);

    expect(attempt).toEqual({ kind: 'invalid_response', httpStatus: 502 });
  });

  it('distingue un error de red', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));

    const attempt = await createSnailPayClient({ fetchFn }).charge(CHARGE_REQUEST);

    expect(attempt).toEqual({ kind: 'network_error' });
  });

  it('aborta la petición y reporta timeout cuando SnailPay no responde a tiempo', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const pending = createSnailPayClient({ fetchFn, timeoutMs: 5_000 }).charge(CHARGE_REQUEST);
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(pending).resolves.toEqual({ kind: 'timeout' });
  });
});
