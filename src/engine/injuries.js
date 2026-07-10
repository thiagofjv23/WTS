/**
 * Injury System (#5 — desgaste e lesões).
 *
 * Desgaste cumulativo (`athlete.condition.wear`) sobe com a carga de lutas e
 * recupera com o tempo (aplicado de forma lazy). Após cada competição, cada
 * participante rola risco de lesão em função da carga, do desgaste e da
 * durabilidade (resistência/recuperação). Determinístico via RandomSystem.
 *
 * A ocorrência de lesões pertence à fase de Consequências (simulation_director
 * §9); o retorno é tratado pelo Recovery System (recovery.js).
 */

import { ATHLETE_STATUS } from "../entities/athlete.js";
import { addDays, daysBetween } from "../utils/dates.js";

// --- Parâmetros (calibração — ver TODO) -------------------------------------
const WEAR_PER_MATCH = 8; // desgaste por luta disputada
const WEAR_RECOVERY_PER_DAY = 1.2; // desgaste recuperado por dia de descanso
const BASE_INJURY_PER_MATCH = 0.012; // risco base por luta
// Severidades: semanas de afastamento e peso relativo.
const SEVERITIES = [
  { id: "leve", weeksMin: 2, weeksMax: 4, weight: 60 },
  { id: "moderada", weeksMin: 6, weeksMax: 10, weight: 30 },
  { id: "grave", weeksMin: 16, weeksMax: 28, weight: 10 }, // "cirurgia"
];
// ----------------------------------------------------------------------------

/** Recupera desgaste desde a última atualização (lazy) e registra a data. */
export function updateWear(athlete, date) {
  const c = athlete.condition;
  if (c.wearUpdated) {
    const days = daysBetween(c.wearUpdated, date);
    if (days > 0) c.wear = Math.max(0, c.wear - days * WEAR_RECOVERY_PER_DAY);
  }
  c.wearUpdated = date;
}

/** Durabilidade (0..1): resistência + recuperação reduzem o risco. */
function durability(attr) {
  return ((attr.resistencia ?? 60) + (attr.recuperacao ?? 60)) / 200;
}

/**
 * Aplica desgaste e rola lesões para os participantes de uma competição.
 * @param {object} world
 * @param {object} competition
 * @param {Array} allMatches  lutas da competição (para contar a carga por atleta)
 * @param {object} random
 * @param {string} date  data da competição
 * @returns {Array} eventos de lesão { athleteId, severity, until, weeks }
 */
export function applyCompetitionInjuries(world, competition, allMatches, random, date) {
  // Conta lutas disputadas por atleta.
  const matchesFought = new Map();
  for (const m of allMatches) {
    matchesFought.set(m.athleteAId, (matchesFought.get(m.athleteAId) || 0) + 1);
    matchesFought.set(m.athleteBId, (matchesFought.get(m.athleteBId) || 0) + 1);
  }

  const injuries = [];
  for (const [athleteId, fights] of matchesFought) {
    const athlete = world.athletes[athleteId];
    if (!athlete || athlete.status !== ATHLETE_STATUS.ACTIVE) continue;

    updateWear(athlete, date);
    athlete.condition.wear += fights * WEAR_PER_MATCH;

    const wearFactor = 1 + athlete.condition.wear / 100;
    const durFactor = 1.5 - durability(athlete.attributes); // ~0.5..1.5
    const p = BASE_INJURY_PER_MATCH * fights * wearFactor * durFactor;

    if (random.chance(p)) {
      const sev = random.weighted(SEVERITIES.map((s) => ({ value: s, weight: s.weight })));
      const weeks = random.int(sev.weeksMin, sev.weeksMax);
      const until = addDays(date, weeks * 7);
      athlete.status = ATHLETE_STATUS.INJURED;
      athlete.condition.injuredUntil = until;
      athlete.condition.injuriesTotal += 1;
      athlete.condition.wear = Math.min(athlete.condition.wear, 40); // parcial "descanso forçado"
      world.injuries.push({ athleteId, until, severity: sev.id });
      injuries.push({ athleteId, severity: sev.id, until, weeks });
    }
  }
  return injuries;
}
