import { z } from 'zod';

/**
 * Contrato de respuesta de SnailPay. Se valida en tiempo de ejecución: si el backend
 * respondiera algo con otra forma, NUNCA se interpreta como un cobro aprobado.
 */
export const paymentResponseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['approved', 'rejected', 'error']),
  status_detail: z.string().min(1),
  transaction_amount: z.number().nullable(),
  date_created: z.string(),
  authorization_code: z.string().nullable(),
  reference: z.string(),
  payer_id: z.string().nullable(),
  payer_email: z.string().nullable(),
  card_number: z.string().nullable(),
  cvv: z.string().nullable(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

export interface ChargeRequest {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
  amount: number;
  payerId: string;
  payerEmail: string;
}

/** Resultado técnico de la llamada HTTP, antes de aplicar reglas de negocio. */
export type ChargeAttempt =
  | { kind: 'response'; httpStatus: number; payment: PaymentResponse }
  | { kind: 'timeout' }
  | { kind: 'network_error' }
  | { kind: 'invalid_response'; httpStatus: number };
