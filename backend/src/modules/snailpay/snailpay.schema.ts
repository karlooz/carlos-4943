import { z } from 'zod';
import { STATUS_DETAIL } from './snailpay.constants.js';
import type { ChargeRequest, FieldError, StatusDetail } from './snailpay.types.js';

const hasAtMostTwoDecimals = (value: number): boolean =>
  Math.abs(Math.round(value * 100) - value * 100) < 1e-9;

/**
 * Esquema del cuerpo de `POST /api/snailpay/payments`.
 * Se usa snake_case para ser consistente con el formato de las respuestas.
 */
export const chargeRequestSchema = z.object({
  card_number: z.string().regex(/^\d{16}$/, 'Debe contener exactamente 16 dígitos'),
  expiration_date: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Debe tener el formato MM/AA con un mes válido'),
  cvv: z.string().regex(/^\d{3}$/, 'Debe contener exactamente 3 dígitos'),
  cardholder_name: z
    .string()
    .trim()
    .min(1, 'Es obligatorio')
    .max(100, 'No debe exceder 100 caracteres'),
  transaction_amount: z
    .number({ error: 'Debe ser un número' })
    .positive('Debe ser mayor que cero')
    .refine(hasAtMostTwoDecimals, 'Debe tener como máximo dos decimales'),
  payer_id: z.string().trim().min(1, 'Es obligatorio').max(64, 'No debe exceder 64 caracteres'),
  payer_email: z.email('Debe ser un correo válido'),
});

export type ChargeRequestBody = z.infer<typeof chargeRequestSchema>;

/**
 * Prioridad con la que se reporta `status_detail` cuando hay varios campos inválidos.
 * La lista completa de problemas se devuelve igualmente en `errors`.
 */
const FIELD_STATUS_DETAIL: ReadonlyArray<[keyof ChargeRequestBody, StatusDetail]> = [
  ['card_number', STATUS_DETAIL.invalidCardNumber],
  ['expiration_date', STATUS_DETAIL.invalidExpirationDate],
  ['cvv', STATUS_DETAIL.invalidSecurityCode],
  ['cardholder_name', STATUS_DETAIL.invalidCardholderName],
  ['transaction_amount', STATUS_DETAIL.invalidAmount],
  ['payer_id', STATUS_DETAIL.invalidPayer],
  ['payer_email', STATUS_DETAIL.invalidPayer],
];

export type ParseChargeResult =
  | { success: true; data: ChargeRequest }
  | { success: false; statusDetail: StatusDetail; errors: FieldError[] };

export function parseChargeRequest(body: unknown): ParseChargeResult {
  const parsed = chargeRequestSchema.safeParse(body);

  if (parsed.success) {
    const data = parsed.data;
    return {
      success: true,
      data: {
        cardNumber: data.card_number,
        expirationDate: data.expiration_date,
        cvv: data.cvv,
        cardholderName: data.cardholder_name,
        amount: data.transaction_amount,
        payerId: data.payer_id,
        payerEmail: data.payer_email.toLowerCase(),
      },
    };
  }

  const errors: FieldError[] = parsed.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  const invalidFields = new Set(errors.map((error) => error.field));
  const firstMatch = FIELD_STATUS_DETAIL.find(([field]) => invalidFields.has(field));

  return {
    success: false,
    statusDetail: firstMatch ? firstMatch[1] : STATUS_DETAIL.invalidRequest,
    errors,
  };
}
