import type { User } from '../../auth/auth.types';
import { creditApprovedPayment, recordTransaction } from '../../wallet/services/walletService';
import type { SnailPayClient } from '../api/snailpayClient';
import {
  INCONSISTENT_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_MESSAGE,
  getStatusDetailMessage,
} from '../snailpay.messages';
import type { PaymentResponse } from '../snailpay.types';

export interface TopUpInput {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
  amount: number;
}

export type TopUpResult =
  | { kind: 'approved'; payment: PaymentResponse; newBalanceCents: number; message: string }
  | { kind: 'rejected'; payment: PaymentResponse; message: string }
  | { kind: 'system_error'; payment: PaymentResponse | null; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'network_error'; message: string };

/**
 * Un pago solo se considera aprobado si TODO es consistente: código HTTP, estado,
 * código de autorización, monto y pagador. Así se evitan falsos cobros exitosos.
 */
function isTrustedApproval(
  httpStatus: number,
  payment: PaymentResponse,
  input: TopUpInput,
  user: User,
): boolean {
  return (
    httpStatus === 201 &&
    payment.status === 'approved' &&
    Boolean(payment.authorization_code) &&
    payment.transaction_amount === input.amount &&
    payment.payer_id === user.id
  );
}

export async function performTopUp(
  client: SnailPayClient,
  user: User,
  input: TopUpInput,
): Promise<TopUpResult> {
  const attempt = await client.charge({ ...input, payerId: user.id, payerEmail: user.email });

  switch (attempt.kind) {
    case 'timeout':
      return { kind: 'timeout', message: TIMEOUT_MESSAGE };
    case 'network_error':
      return { kind: 'network_error', message: NETWORK_ERROR_MESSAGE };
    case 'invalid_response':
      return { kind: 'system_error', payment: null, message: INCONSISTENT_RESPONSE_MESSAGE };
    case 'response':
      break;
  }

  const { httpStatus, payment } = attempt;

  if (isTrustedApproval(httpStatus, payment, input, user)) {
    const newBalanceCents = creditApprovedPayment(user.id, payment);
    return {
      kind: 'approved',
      payment,
      newBalanceCents,
      message: getStatusDetailMessage(payment.status_detail),
    };
  }

  recordTransaction(user.id, payment);

  if (payment.status === 'rejected') {
    return { kind: 'rejected', payment, message: getStatusDetailMessage(payment.status_detail) };
  }

  const message =
    payment.status === 'approved'
      ? INCONSISTENT_RESPONSE_MESSAGE
      : getStatusDetailMessage(payment.status_detail);
  return { kind: 'system_error', payment, message };
}
