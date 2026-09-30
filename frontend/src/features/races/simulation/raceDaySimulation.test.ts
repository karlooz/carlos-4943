import { describe, expect, it } from 'vitest';
import { RACES_PER_DAY, SNAILS } from '../races.constants';
import { simulateRaceDay, summarizeBets, summarizeWins } from './raceDaySimulation';

const SEEDS = ['usuario-a', 'usuario-b', 'otro-usuario', 'x'];
const DATE = '2026-09-28';

describe('simulateRaceDay', () => {
  it.each(SEEDS)('la suma de victorias es igual al número de carreras (semilla %s)', (seed) => {
    const day = simulateRaceDay({ seed, date: DATE });
    const totalWins = day.winsBySnail.reduce((sum, snail) => sum + snail.wins, 0);

    expect(day.races).toHaveLength(RACES_PER_DAY);
    expect(totalWins).toBe(RACES_PER_DAY);
  });

  it('incluye a los 6 caracoles en la gráfica, aunque tengan 0 victorias', () => {
    const day = simulateRaceDay({ seed: 'usuario-a', date: DATE });

    expect(SNAILS).toHaveLength(6);
    expect(day.winsBySnail.map((snail) => snail.snailId)).toEqual(SNAILS.map((snail) => snail.id));
  });

  it.each(SEEDS)('una apuesta se gana si y solo si eligió al ganador (semilla %s)', (seed) => {
    const day = simulateRaceDay({ seed, date: DATE });

    for (const bet of day.bets) {
      const race = day.races.find((candidate) => candidate.number === bet.raceNumber);
      expect(race).toBeDefined();
      expect(bet.won).toBe(bet.snailId === race?.winnerId);
    }
    expect(day.betSummary.won + day.betSummary.lost).toBe(day.bets.length);
  });

  it('es determinista para la misma semilla y fecha', () => {
    expect(simulateRaceDay({ seed: 'usuario-a', date: DATE })).toEqual(
      simulateRaceDay({ seed: 'usuario-a', date: DATE }),
    );
  });

  it('cambia de un día a otro', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map((date) =>
      simulateRaceDay({ seed: 'usuario-a', date })
        .races.map((race) => race.winnerId)
        .join(),
    );

    expect(new Set(days).size).toBeGreaterThan(1);
  });
});

describe('resúmenes', () => {
  it('summarizeWins cuenta victorias por caracol', () => {
    const races = [
      { number: 1, startTime: '11:00', winnerId: 'turbo' },
      { number: 2, startTime: '13:00', winnerId: 'turbo' },
      { number: 3, startTime: '15:00', winnerId: 'babosin' },
    ];
    const wins = summarizeWins(races, SNAILS);

    expect(wins.find((snail) => snail.snailId === 'turbo')?.wins).toBe(2);
    expect(wins.find((snail) => snail.snailId === 'babosin')?.wins).toBe(1);
    expect(wins.find((snail) => snail.snailId === 'lentejuela')?.wins).toBe(0);
  });

  it('summarizeBets separa ganadas y perdidas', () => {
    const summary = summarizeBets([
      { raceNumber: 1, snailId: 'turbo', amount: 20, won: true },
      { raceNumber: 1, snailId: 'babosin', amount: 50, won: false },
      { raceNumber: 2, snailId: 'turbo', amount: 20, won: false },
    ]);

    expect(summary).toEqual({ won: 1, lost: 2, total: 3 });
  });
});
