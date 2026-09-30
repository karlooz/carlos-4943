/**
 * Datos ficticios que disparan cada escenario simulado de SnailPay.
 * Todos los números de tarjeta son de prueba y no corresponden a tarjetas reales.
 */
export const APPROVED_TEST_CARD = {
  cardNumber: '1234123412341234',
  expirationDate: '12/26',
  cvv: '543',
} as const;

export const SCENARIO_CARDS = {
  insufficientFunds: '4000000000000002',
  highRisk: '4000000000000119',
  systemError: '5000000000000001',
  timeout: '5000000000000019',
} as const;

/** Monto máximo permitido por operación (en pesos). */
export const MAX_TRANSACTION_AMOUNT = 10_000;

export const PAYMENT_STATUS = {
  approved: 'approved',
  rejected: 'rejected',
  error: 'error',
} as const;

export const STATUS_DETAIL = {
  accredited: 'accredited',
  invalidRequest: 'invalid_request',
  invalidCardNumber: 'invalid_card_number',
  invalidExpirationDate: 'invalid_expiration_date',
  invalidSecurityCode: 'invalid_security_code',
  invalidCardholderName: 'invalid_cardholder_name',
  invalidAmount: 'invalid_amount',
  invalidPayer: 'invalid_payer',
  badExpirationDate: 'cc_rejected_bad_expiration_date',
  badSecurityCode: 'cc_rejected_bad_security_code',
  cardExpired: 'cc_rejected_card_expired',
  insufficientFunds: 'cc_rejected_insufficient_funds',
  highRisk: 'cc_rejected_high_risk',
  amountLimitExceeded: 'cc_rejected_amount_limit_exceeded',
  cardDeclined: 'cc_rejected_card_declined',
  serviceUnavailable: 'snailpay_service_unavailable',
  processingTimeout: 'snailpay_processing_timeout',
} as const;
