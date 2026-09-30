import { Button } from '../../../shared/components/Button';
import { formatCents } from '../../../shared/utils/money';

interface BalanceCardProps {
  balanceCents: number;
  onTopUp: () => void;
}

export function BalanceCard({ balanceCents, onTopUp }: BalanceCardProps) {
  return (
    <section className="balance-card" aria-label="Saldo">
      <p className="balance-card__label">Saldo disponible</p>
      <p className="balance-card__amount" data-testid="balance">
        {formatCents(balanceCents)}
      </p>
      <Button variant="secondary" onClick={onTopUp}>
        Recargar con SnailPay
      </Button>
    </section>
  );
}
