import { useState } from 'react';
import { Panel } from '../../../shared/components/Panel';
import { useAuthenticatedUser } from '../../auth/hooks/useAuth';
import { BetsDonutChart } from '../../races/components/BetsDonutChart';
import { RaceResultsList } from '../../races/components/RaceResultsList';
import { SnailWinsBarChart } from '../../races/components/SnailWinsBarChart';
import { useRaceDay } from '../../races/hooks/useRaceDay';
import { TopUpDialog } from '../../snailpay/components/TopUpDialog';
import { TransactionHistory } from '../../wallet/components/TransactionHistory';
import { useWallet } from '../../wallet/hooks/useWallet';
import { BalanceCard } from '../components/BalanceCard';
import { DashboardHeader } from '../components/DashboardHeader';

const longDateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' });

export function DashboardPage() {
  const { user, logout } = useAuthenticatedUser();
  const wallet = useWallet(user.id);
  const raceDay = useRaceDay(user.id);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const firstName = user.fullName.split(' ')[0];

  return (
    <div className="dashboard">
      <DashboardHeader fullName={user.fullName} onLogout={logout} />

      <main className="dashboard__content">
        <section className="welcome">
          <div>
            <h1 className="welcome__title">Hola, {firstName} 👋</h1>
            <p className="welcome__subtitle">
              Resumen simulado del {longDateFormatter.format(new Date(`${raceDay.date}T12:00:00`))}
            </p>
          </div>
          <BalanceCard balanceCents={wallet.balanceCents} onTopUp={() => setIsTopUpOpen(true)} />
        </section>

        <div className="grid grid--charts">
          <Panel
            title="Mis apuestas del día"
            subtitle={`${raceDay.betSummary.total} apuestas en ${raceDay.races.length} carreras`}
          >
            <BetsDonutChart summary={raceDay.betSummary} />
          </Panel>
          <Panel title="Victorias por caracol" subtitle="6 caracoles · 6 carreras del día">
            <SnailWinsBarChart wins={raceDay.winsBySnail} />
          </Panel>
        </div>

        <div className="grid grid--details">
          <Panel title="Resultados de las carreras">
            <RaceResultsList raceDay={raceDay} />
          </Panel>
          <Panel title="Últimas recargas" subtitle="Operaciones procesadas por SnailPay">
            <TransactionHistory transactions={wallet.transactions} />
          </Panel>
        </div>

        <p className="disclaimer">
          Datos de carreras y apuestas simulados con fines demostrativos. No se usa dinero real.
        </p>
      </main>

      {isTopUpOpen && (
        <TopUpDialog
          user={user}
          onClose={() => setIsTopUpOpen(false)}
          onCompleted={wallet.refresh}
        />
      )}
    </div>
  );
}
