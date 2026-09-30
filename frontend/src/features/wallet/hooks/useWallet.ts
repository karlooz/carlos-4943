import { useCallback, useState } from 'react';
import type { PaymentResponse } from '../../snailpay/snailpay.types';
import { getBalanceCents, getTransactions } from '../services/walletService';

interface WalletState {
  balanceCents: number;
  transactions: PaymentResponse[];
}

const readWallet = (userId: string): WalletState => ({
  balanceCents: getBalanceCents(userId),
  transactions: getTransactions(userId),
});

/** Estado del saldo e historial del usuario, leído desde LocalStorage. */
export function useWallet(userId: string) {
  const [wallet, setWallet] = useState<WalletState>(() => readWallet(userId));

  const refresh = useCallback(() => setWallet(readWallet(userId)), [userId]);

  return { ...wallet, refresh };
}
