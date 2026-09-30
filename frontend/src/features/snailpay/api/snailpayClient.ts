import { appConfig } from '../../../config';
import { paymentResponseSchema } from '../snailpay.types';
import type { ChargeAttempt, ChargeRequest } from '../snailpay.types';

export interface SnailPayClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

const PAYMENTS_PATH = '/api/snailpay/payments';

/**
 * Cliente HTTP de SnailPay. No lanza excepciones: traduce cada posible desenlace
 * (respuesta, timeout, error de red, respuesta inesperada) a un `ChargeAttempt` tipado.
 */
export function createSnailPayClient({
  baseUrl = appConfig.apiBaseUrl,
  timeoutMs = appConfig.snailPayTimeoutMs,
  fetchFn = (...args) => fetch(...args),
}: SnailPayClientOptions = {}) {
  async function charge(request: ChargeRequest): Promise<ChargeAttempt> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(`${baseUrl}${PAYMENTS_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          card_number: request.cardNumber,
          expiration_date: request.expirationDate,
          cvv: request.cvv,
          cardholder_name: request.cardholderName,
          transaction_amount: request.amount,
          payer_id: request.payerId,
          payer_email: request.payerEmail,
        }),
      });

      const json: unknown = await response.json().catch(() => null);
      const parsed = paymentResponseSchema.safeParse(json);

      return parsed.success
        ? { kind: 'response', httpStatus: response.status, payment: parsed.data }
        : { kind: 'invalid_response', httpStatus: response.status };
    } catch {
      return controller.signal.aborted ? { kind: 'timeout' } : { kind: 'network_error' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { charge };
}

export type SnailPayClient = ReturnType<typeof createSnailPayClient>;

export const snailPayClient = createSnailPayClient();
