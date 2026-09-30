import { maskCardNumber } from '../../../shared/utils/cardFormat';
import { formatAmount } from '../../../shared/utils/money';
import type { PaymentResponse } from '../../snailpay/snailpay.types';

const STATUS_LABELS: Record<PaymentResponse['status'], string> = {
  approved: 'Aprobada',
  rejected: 'Rechazada',
  error: 'Error',
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

export function TransactionHistory({ transactions }: { transactions: PaymentResponse[] }) {
  if (transactions.length === 0) {
    return <p className="empty-state">Aún no tienes recargas. ¡Haz la primera con SnailPay!</p>;
  }

  return (
    <ul className="tx-list">
      {transactions.slice(0, 6).map((transaction) => (
        <li key={transaction.id} className="tx-list__item">
          <div>
            <p className="tx-list__amount">
              {transaction.transaction_amount !== null
                ? formatAmount(transaction.transaction_amount)
                : '—'}
            </p>
            <p className="tx-list__meta">
              {dateFormatter.format(new Date(transaction.date_created))}
              {transaction.card_number ? ` · ${maskCardNumber(transaction.card_number)}` : ''}
            </p>
          </div>
          <span className={`badge badge--${transaction.status}`}>
            {STATUS_LABELS[transaction.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
