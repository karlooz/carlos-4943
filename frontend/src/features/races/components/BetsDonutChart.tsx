import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { BetSummary } from '../simulation/raceDaySimulation';

const COLORS = { won: 'var(--color-success)', lost: 'var(--color-danger)' } as const;

export function BetsDonutChart({ summary }: { summary: BetSummary }) {
  const data = [
    { key: 'won', label: 'Ganadas', value: summary.won },
    { key: 'lost', label: 'Perdidas', value: summary.lost },
  ] as const;
  const winRate = summary.total > 0 ? Math.round((summary.won / summary.total) * 100) : 0;

  return (
    <div className="donut">
      <div
        className="donut__chart"
        role="img"
        aria-label={`Apuestas del día: ${summary.won} ganadas y ${summary.lost} perdidas de ${summary.total}.`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={[...data]}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${String(value)} ${value === 1 ? 'apuesta' : 'apuestas'}`]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut__center" aria-hidden="true">
          <span className="donut__value">{winRate}%</span>
          <span className="donut__label">aciertos</span>
        </div>
      </div>
      <ul className="legend">
        {data.map((entry) => (
          <li key={entry.key} className="legend__item">
            <span className="legend__swatch" style={{ background: COLORS[entry.key] }} />
            {entry.label}
            <strong className="legend__value">{entry.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
