/**
 * Recovery System (simulation_director.md §4).
 *
 * Roda a cada dia: reativa os atletas que cumpriram o período de recuperação de
 * lesão. Mantém a lista `world.injuries` enxuta (processa só os lesionados).
 */

import { ATHLETE_STATUS } from "../entities/athlete.js";

/**
 * Processa o retorno de atletas lesionados na data informada.
 * @returns {Array} eventos de recuperação { athleteId }
 */
export function processRecovery(world, date) {
  if (!world.injuries || world.injuries.length === 0) return [];
  const recovered = [];
  const stillOut = [];
  for (const inj of world.injuries) {
    if (date >= inj.until) {
      const a = world.athletes[inj.athleteId];
      if (a && a.status === ATHLETE_STATUS.INJURED) {
        a.status = ATHLETE_STATUS.ACTIVE;
        a.condition.injuredUntil = null;
      }
      recovered.push({ athleteId: inj.athleteId });
    } else {
      stillOut.push(inj);
    }
  }
  world.injuries = stillOut;
  return recovered;
}
