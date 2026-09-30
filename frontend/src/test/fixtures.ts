import type { User } from '../features/auth/auth.types';
import type { ChargeRequest, PaymentResponse } from '../features/snailpay/snailpay.types';

export const TEST_USER: User = {
  id: 'user-1',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  createdAt: '2026-09-28T10:00:00.000Z',
};

export const CHARGE_REQUEST: ChargeRequest = {
  cardNumber: '1234123412341234',
  expirationDate: '12/26',
  cvv: '543',
  cardholderName: 'Ana Pérez',
  amount: 150.5,
  payerId: TEST_USER.id,
  payerEmail: TEST_USER.email,
};

export const buildPayment = (overrides: Partial<PaymentResponse> = {}): PaymentResponse => ({
  id: 'pay-1',
  status: 'approved',
  status_detail: 'accredited',
  transaction_amount: CHARGE_REQUEST.amount,
  date_created: '2026-09-28T10:00:00.000Z',
  authorization_code: 'ABC123',
  reference: 'SP-20260928-PAY1',
  payer_id: TEST_USER.id,
  payer_email: TEST_USER.email,
  card_number: CHARGE_REQUEST.cardNumber,
  cvv: CHARGE_REQUEST.cvv,
  ...overrides,
});
