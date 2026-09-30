import {
  BET_AMOUNTS,
  FIRST_RACE_HOUR,
  HOURS_BETWEEN_RACES,
  MAX_BETS_PER_RACE,
  MIN_BETS_PER_RACE,
  RACES_PER_DAY,
  SNAILS,
} from '../races.constants';
import type { Snail } from '../races.constants';
import { createSeededRandom, hashSeed, pickOne, pickWeighted, randomInt } from './seededRandom';

export interface Race {
  number: number;
  startTime: string;
  winnerId: string;
}

export interface Bet {
  raceNumber: number;
  snailId: string;
  amount: number;
  won: boolean;
}

export interface SnailWins {
  snailId: string;
  name: string;
  color: string;
  wins: number;
}

export interface BetSummary {
  won: number;
  lost: number;
  total: number;
}

export interface RaceDay {
  date: string;
  races: Race[];
  bets: Bet[];
  winsBySnail: SnailWins[];
  betSummary: BetSummary;
}

export interface SimulateRaceDayOptions {
  seed: string;
  date: string;
  snails?: readonly Snail[];
  raceCount?: number;
}

const formatHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

export function summarizeWins(races: readonly Race[], snails: readonly Snail[]): SnailWins[] {
  return snails.map((snail) => ({
    snailId: snail.id,
    name: snail.name,
    color: snail.color,
    wins: races.filter((race) => race.winnerId === snail.id).length,
  }));
}

export function summarizeBets(bets: readonly Bet[]): BetSummary {
  const won = bets.filter((bet) => bet.won).length;
  return { won, lost: bets.length - won, total: bets.length };
}

/**
 * Simula un día de carreras de forma determinista (misma semilla => mismo resultado).
 *
 * Reglas que garantizan congruencia entre las gráficas:
 * - Cada carrera tiene exactamente un ganador, así que la suma de victorias = número de carreras.
 * - Todas las apuestas pertenecen a carreras de ese día, y una apuesta se gana
 *   si y solo si el caracol elegido es el ganador de su carrera.
 */
export function simulateRaceDay({
  seed,
  date,
  snails = SNAILS,
  raceCount = RACES_PER_DAY,
}: SimulateRaceDayOptions): RaceDay {
  const random = createSeededRandom(hashSeed(`${seed}:${date}`));

  const races: Race[] = Array.from({ length: raceCount }, (_, index) => ({
    number: index + 1,
    startTime: formatHour(FIRST_RACE_HOUR + index * HOURS_BETWEEN_RACES),
    winnerId: pickWeighted(random, snails, (snail) => snail.speed).id,
  }));

  const bets: Bet[] = races.flatMap((race) => {
    const betCount = randomInt(random, MIN_BETS_PER_RACE, MAX_BETS_PER_RACE);
    return Array.from({ length: betCount }, () => {
      const snailId = pickOne(random, snails).id;
      return {
        raceNumber: race.number,
        snailId,
        amount: pickOne(random, BET_AMOUNTS),
        won: snailId === race.winnerId,
      };
    });
  });

  return {
    date,
    races,
    bets,
    winsBySnail: summarizeWins(races, snails),
    betSummary: summarizeBets(bets),
  };
}
