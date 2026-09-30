/** Traduce `status_detail` de SnailPay a mensajes comprensibles para el usuario. */
const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  accredited: 'Tu recarga fue aprobada y el saldo ya está disponible.',
  invalid_request: 'La solicitud de pago no es válida. Revisa los datos e intenta de nuevo.',
  invalid_card_number: 'El número de tarjeta no es válido.',
  invalid_expiration_date: 'La fecha de vencimiento no es válida.',
  invalid_security_code: 'El CVV no es válido.',
  invalid_cardholder_name: 'El nombre del titular no es válido.',
  invalid_amount: 'El monto de la recarga no es válido.',
  invalid_payer: 'No pudimos identificar tu cuenta. Cierra sesión e inicia de nuevo.',
  cc_rejected_bad_expiration_date: 'La fecha de vencimiento no coincide con la de la tarjeta.',
  cc_rejected_bad_security_code: 'El código de seguridad (CVV) es incorrecto.',
  cc_rejected_card_expired: 'La tarjeta está vencida. Usa otra tarjeta.',
  cc_rejected_insufficient_funds: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_high_risk: 'El pago fue rechazado por prevención de fraude. Usa otra tarjeta.',
  cc_rejected_amount_limit_exceeded: 'El monto supera el límite por operación de $10,000.00.',
  cc_rejected_card_declined: 'La tarjeta fue rechazada por el emisor.',
  snailpay_service_unavailable:
    'SnailPay no está disponible en este momento. No se realizó ningún cargo; intenta más tarde.',
  snailpay_processing_timeout:
    'SnailPay tardó demasiado en responder. No se aplicó ninguna recarga a tu saldo.',
};

export const GENERIC_PAYMENT_ERROR = 'No fue posible procesar la recarga. Intenta de nuevo.';

export const TIMEOUT_MESSAGE =
  'SnailPay tardó demasiado en responder. No se aplicó ninguna recarga a tu saldo; verifica tu historial antes de reintentar.';

export const NETWORK_ERROR_MESSAGE =
  'No pudimos conectar con SnailPay. Revisa tu conexión; tu saldo no fue modificado.';

export const INCONSISTENT_RESPONSE_MESSAGE =
  'Recibimos una respuesta inesperada de SnailPay, por seguridad no se aplicó la recarga.';

export const getStatusDetailMessage = (statusDetail: string): string =>
  STATUS_DETAIL_MESSAGES[statusDetail] ?? GENERIC_PAYMENT_ERROR;
