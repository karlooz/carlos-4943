import type { PAYMENT_STATUS, STATUS_DETAIL } from './snailpay.constants.js';

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type StatusDetail = (typeof STATUS_DETAIL)[keyof typeof STATUS_DETAIL];

export interface ChargeRequest {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
  amount: number;
  payerId: string;
  payerEmail: string;
}

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Contrato de respuesta de SnailPay. Es el mismo para cobro exitoso, error de transacción
 * y error del sistema; los campos que no aplican se devuelven como `null`.
 */
export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  status_detail: StatusDetail;
  transaction_amount: number | null;
  date_created: string;
  authorization_code: string | null;
  reference: string;
  payer_id: string | null;
  payer_email: string | null;
  card_number: string | null;
  cvv: string | null;
  errors?: FieldError[];
}

/** Resultado interno del procesamiento: respuesta + código HTTP + si debe simular latencia. */
export interface ChargeOutcome {
  httpStatus: number;
  body: PaymentResponse;
  simulateTimeout?: boolean;
}
