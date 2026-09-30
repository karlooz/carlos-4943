import { z } from 'zod';
import { STORAGE_KEYS, readJson, writeJson } from '../../../shared/storage/storage';
import { toCents } from '../../../shared/utils/money';
import { paymentResponseSchema } from '../../snailpay/snailpay.types';
import type { PaymentResponse } from '../../snailpay/snailpay.types';

const walletSchema = z.object({
  balanceCents: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
const walletsSchema = z.record(z.string(), walletSchema);
const transactionsSchema = z.record(z.string(), z.array(paymentResponseSchema));

export type Wallet = z.infer<typeof walletSchema>;

const readWallets = () => readJson(STORAGE_KEYS.wallets, walletsSchema, {});
const readAllTransactions = () => readJson(STORAGE_KEYS.transactions, transactionsSchema, {});

/** Todo usuario inicia con saldo $0. */
export function getBalanceCents(userId: string): number {
  return readWallets()[userId]?.balanceCents ?? 0;
}

/** Historial de respuestas de SnailPay del usuario, de la más reciente a la más antigua. */
export function getTransactions(userId: string): PaymentResponse[] {
  return readAllTransactions()[userId] ?? [];
}

/**
 * Guarda la respuesta de SnailPay en el historial. Por requerimiento se conservan
 * número de tarjeta y CVV (siempre ficticios) tal como los devuelve el servicio.
 */
export function recordTransaction(userId: string, payment: PaymentResponse): void {
  const all = readAllTransactions();
  const current = all[userId] ?? [];
  if (current.some((transaction) => transaction.id === payment.id)) return;

  writeJson(STORAGE_KEYS.transactions, { ...all, [userId]: [payment, ...current] });
}

/**
 * Abona el monto de un pago aprobado. Es idempotente por id de operación:
 * el mismo pago nunca se acredita dos veces.
 */
export function creditApprovedPayment(userId: string, payment: PaymentResponse): number {
  const alreadyApplied = getTransactions(userId).some(
    (transaction) => transaction.id === payment.id && transaction.status === 'approved',
  );
  if (alreadyApplied || payment.status !== 'approved' || payment.transaction_amount === null) {
    return getBalanceCents(userId);
  }

  const newBalance = getBalanceCents(userId) + toCents(payment.transaction_amount);
  writeJson(STORAGE_KEYS.wallets, {
    ...readWallets(),
    [userId]: { balanceCents: newBalance, updatedAt: new Date().toISOString() },
  });
  recordTransaction(userId, payment);
  return newBalance;
}
