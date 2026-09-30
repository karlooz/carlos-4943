import { randomInt, randomUUID } from 'node:crypto';
import {
  APPROVED_TEST_CARD,
  MAX_TRANSACTION_AMOUNT,
  PAYMENT_STATUS,
  SCENARIO_CARDS,
  STATUS_DETAIL,
} from './snailpay.constants.js';
import { parseChargeRequest } from './snailpay.schema.js';
import type {
  ChargeOutcome,
  ChargeRequest,
  PaymentResponse,
  PaymentStatus,
  StatusDetail,
} from './snailpay.types.js';

export interface SnailPayServiceOptions {
  /** Cuando es `true`, todas las solicitudes válidas terminan en error del sistema (503). */
  simulateOutage: boolean;
  /** Reloj inyectable para poder probar la lógica de vencimiento de tarjetas. */
  now?: () => Date;
  /** Generador de ids inyectable para pruebas deterministas. */
  generateId?: () => string;
}

interface Decision {
  httpStatus: number;
  status: PaymentStatus;
  statusDetail: StatusDetail;
  simulateTimeout?: boolean;
}

const AUTHORIZATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AUTHORIZATION_CODE_LENGTH = 6;

function generateAuthorizationCode(): string {
  return Array.from(
    { length: AUTHORIZATION_CODE_LENGTH },
    () => AUTHORIZATION_CODE_ALPHABET[randomInt(AUTHORIZATION_CODE_ALPHABET.length)],
  ).join('');
}

function buildReference(date: Date, id: string): string {
  const datePart = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `SP-${datePart}-${id.slice(0, 8).toUpperCase()}`;
}

/** Una tarjeta vence al terminar el último día de su mes de expiración (MM/AA). */
export function isCardExpired(expirationDate: string, now: Date): boolean {
  const [monthText = '', yearText = ''] = expirationDate.split('/');
  const month = Number(monthText);
  const year = 2000 + Number(yearText);
  const firstDayAfterExpiration = Date.UTC(year, month, 1);
  return now.getTime() >= firstDayAfterExpiration;
}

const approved = (): Decision => ({
  httpStatus: 201,
  status: PAYMENT_STATUS.approved,
  statusDetail: STATUS_DETAIL.accredited,
});

const rejected = (statusDetail: StatusDetail): Decision => ({
  httpStatus: 402,
  status: PAYMENT_STATUS.rejected,
  statusDetail,
});

const systemError = (): Decision => ({
  httpStatus: 503,
  status: PAYMENT_STATUS.error,
  statusDetail: STATUS_DETAIL.serviceUnavailable,
});

const timeoutError = (): Decision => ({
  httpStatus: 504,
  status: PAYMENT_STATUS.error,
  statusDetail: STATUS_DETAIL.processingTimeout,
  simulateTimeout: true,
});

/**
 * Reglas de negocio del mock. El orden importa: primero los errores del sistema
 * (nada se aprueba si el servicio "está caído"), después las reglas de riesgo
 * y por último la validación de la tarjeta de prueba aprobada.
 */
function decide(request: ChargeRequest, simulateOutage: boolean, now: Date): Decision {
  if (simulateOutage || request.cardNumber === SCENARIO_CARDS.systemError) {
    return systemError();
  }

  if (request.cardNumber === SCENARIO_CARDS.timeout) {
    return timeoutError();
  }

  if (request.amount > MAX_TRANSACTION_AMOUNT) {
    return rejected(STATUS_DETAIL.amountLimitExceeded);
  }

  const isApprovedTestCard = request.cardNumber === APPROVED_TEST_CARD.cardNumber;
  const matchesApprovedExpiration = request.expirationDate === APPROVED_TEST_CARD.expirationDate;

  // La tarjeta aprobada con su fecha documentada siempre funciona, sin depender del reloj.
  const isDocumentedApprovedCard = isApprovedTestCard && matchesApprovedExpiration;
  if (!isDocumentedApprovedCard && isCardExpired(request.expirationDate, now)) {
    return rejected(STATUS_DETAIL.cardExpired);
  }

  switch (request.cardNumber) {
    case SCENARIO_CARDS.insufficientFunds:
      return rejected(STATUS_DETAIL.insufficientFunds);
    case SCENARIO_CARDS.highRisk:
      return rejected(STATUS_DETAIL.highRisk);
    case APPROVED_TEST_CARD.cardNumber:
      if (!matchesApprovedExpiration) return rejected(STATUS_DETAIL.badExpirationDate);
      if (request.cvv !== APPROVED_TEST_CARD.cvv) return rejected(STATUS_DETAIL.badSecurityCode);
      return approved();
    default:
      return rejected(STATUS_DETAIL.cardDeclined);
  }
}

function readField(body: unknown, key: string): unknown {
  if (typeof body !== 'object' || body === null) return undefined;
  return (body as Record<string, unknown>)[key];
}

function readString(body: unknown, key: string): string | null {
  const value = readField(body, key);
  return typeof value === 'string' ? value : null;
}

function readNumber(body: unknown, key: string): number | null {
  const value = readField(body, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Crea el servicio de SnailPay. Recibe el cuerpo crudo de la petición y siempre
 * devuelve una respuesta con el contrato completo, sin importar el resultado.
 */
export function createSnailPayService(options: SnailPayServiceOptions) {
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? randomUUID;

  function buildResponse(
    status: PaymentStatus,
    statusDetail: StatusDetail,
    rawBody: unknown,
  ): PaymentResponse {
    const createdAt = now();
    const id = generateId();

    return {
      id,
      status,
      status_detail: statusDetail,
      transaction_amount: readNumber(rawBody, 'transaction_amount'),
      date_created: createdAt.toISOString(),
      authorization_code: status === PAYMENT_STATUS.approved ? generateAuthorizationCode() : null,
      reference: buildReference(createdAt, id),
      payer_id: readString(rawBody, 'payer_id'),
      payer_email: readString(rawBody, 'payer_email'),
      card_number: readString(rawBody, 'card_number'),
      cvv: readString(rawBody, 'cvv'),
    };
  }

  function processCharge(rawBody: unknown): ChargeOutcome {
    const parsed = parseChargeRequest(rawBody);

    if (!parsed.success) {
      const body = buildResponse(PAYMENT_STATUS.rejected, parsed.statusDetail, rawBody);
      return { httpStatus: 400, body: { ...body, errors: parsed.errors } };
    }

    const decision = decide(parsed.data, options.simulateOutage, now());
    const body = buildResponse(decision.status, decision.statusDetail, rawBody);

    return decision.simulateTimeout
      ? { httpStatus: decision.httpStatus, body, simulateTimeout: true }
      : { httpStatus: decision.httpStatus, body };
  }

  return { processCharge };
}

export type SnailPayService = ReturnType<typeof createSnailPayService>;
