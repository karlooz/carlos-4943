export interface Snail {
  id: string;
  name: string;
  /** Velocidad relativa (1–10). Determina la probabilidad de ganar cada carrera. */
  speed: number;
  color: string;
}

export const SNAILS: readonly Snail[] = [
  { id: 'turbo', name: 'Turbo', speed: 9, color: '#2f7d4f' },
  { id: 'rayo-baboso', name: 'Rayo Baboso', speed: 8, color: '#d9822b' },
  { id: 'caracolina', name: 'Caracolina', speed: 7, color: '#7b5ea7' },
  { id: 'babosin', name: 'Babosín', speed: 6, color: '#2b7bb9' },
  { id: 'don-concha', name: 'Don Concha', speed: 5, color: '#b5485d' },
  { id: 'lentejuela', name: 'Lentejuela', speed: 4, color: '#8a7a2f' },
];

export const RACES_PER_DAY = 6;
export const FIRST_RACE_HOUR = 11;
export const HOURS_BETWEEN_RACES = 2;
export const MIN_BETS_PER_RACE = 1;
export const MAX_BETS_PER_RACE = 3;
export const BET_AMOUNTS = [20, 50, 100, 200] as const;
