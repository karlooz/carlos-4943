import { SNAILS } from '../races.constants';
import type { RaceDay } from '../simulation/raceDaySimulation';

const snailById = new Map(SNAILS.map((snail) => [snail.id, snail]));

export function RaceResultsList({ raceDay }: { raceDay: RaceDay }) {
  return (
    <ol className="race-list">
      {raceDay.races.map((race) => {
        const winner = snailById.get(race.winnerId);
        const raceBets = raceDay.bets.filter((bet) => bet.raceNumber === race.number);
        const wonBets = raceBets.filter((bet) => bet.won).length;

        return (
          <li key={race.number} className="race-list__item">
            <span className="race-list__time">{race.startTime}</span>
            <span className="race-list__race">Carrera {race.number}</span>
            <span className="race-list__winner">
              <span className="dot" style={{ background: winner?.color }} aria-hidden="true" />
              {winner?.name ?? race.winnerId}
            </span>
            <span className="race-list__bets">
              {wonBets}/{raceBets.length} apuestas ganadas
            </span>
          </li>
        );
      })}
    </ol>
  );
}
