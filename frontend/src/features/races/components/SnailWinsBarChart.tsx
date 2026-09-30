import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SnailWins } from '../simulation/raceDaySimulation';

export function SnailWinsBarChart({ wins }: { wins: SnailWins[] }) {
  const description = wins.map((snail) => `${snail.name}: ${snail.wins}`).join(', ');
  const maxWins = Math.max(1, ...wins.map((snail) => snail.wins));

  return (
    <div role="img" aria-label={`Victorias por caracol. ${description}.`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={wins} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, maxWins]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-muted)' }}
            formatter={(value) => [`${String(value)} ${value === 1 ? 'victoria' : 'victorias'}`]}
          />
          <Bar dataKey="wins" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {wins.map((snail) => (
              <Cell key={snail.snailId} fill={snail.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
