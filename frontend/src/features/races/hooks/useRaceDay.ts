import { useMemo } from 'react';
import { simulateRaceDay } from '../simulation/raceDaySimulation';
import type { RaceDay } from '../simulation/raceDaySimulation';

const toLocalIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Día simulado estable por usuario y fecha: no cambia al recargar la página. */
export function useRaceDay(userId: string, today: Date = new Date()): RaceDay {
  const date = toLocalIsoDate(today);
  return useMemo(() => simulateRaceDay({ seed: userId, date }), [userId, date]);
}
