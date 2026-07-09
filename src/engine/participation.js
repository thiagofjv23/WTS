/**
 * Participation System (parte do Athlete AI — simulation_director.md §5).
 *
 * Decide, por atleta e por evento, quem se inscreve numa competição, em vez de
 * simplesmente pegar os top-N por ranking. Baseado nas diretrizes de simulação
 * (sugestões #1 e #4): atletas fortes priorizam eventos de grau alto; atletas
 * de base "farmam" pontos em G-1/G-2; competições recentes geram fadiga.
 *
 * Não decide resultados — apenas monta o campo de inscritos. Determinístico
 * (usa o RandomSystem). Ver DECISIONS.md.
 */

import { championPointsFor } from "../entities/competition.js";
import { athletesInCategory } from "../core/world.js";
import { combatRating } from "./combat/probability.js";
import { daysBetween } from "../utils/dates.js";

const DEFAULT_FIELD_SIZE = 32;
const MIN_FIELD = 8; // garante chaves válidas mesmo se poucos se inscreverem
const FATIGUE_WINDOW = 35; // dias
const FATIGUE_WEIGHT = 0.9;
const BASE_RATE = 1.0;
const GRADE_EXPONENT = 1.5; // quão seletivos os fortes são por grau (calibração)

/** Nº de competições disputadas na janela de fadiga (lê o history, do fim). */
export function recentLoad(athlete, date, windowDays = FATIGUE_WINDOW) {
  const h = athlete.history || [];
  let load = 0;
  for (let i = h.length - 1; i >= 0; i--) {
    const d = daysBetween(h[i].date, date);
    if (d > windowDays) break; // history é cronológico: além da janela, para
    if (d >= 0) load += 1;
  }
  return load;
}

/**
 * Probabilidade de um atleta se inscrever numa competição.
 * @param {object} athlete
 * @param {object} competition
 * @param {number} catSize  nº de atletas ranqueados na categoria
 */
export function enterProbability(athlete, competition, catSize) {
  const pos = athlete.ranking.position || catSize;
  const percentile = catSize > 1 ? 1 - (pos - 1) / (catSize - 1) : 1; // 1 = topo
  const gradeValue = championPointsFor(competition.gRank) / 100; // 0.1 .. 1.0

  // Atração pelo grau: para atletas do topo, eventos pequenos são pouco
  // atraentes; para atletas de base, quase todos os eventos servem.
  const attract = Math.pow(gradeValue, percentile * GRADE_EXPONENT);
  let p = BASE_RATE * attract;

  // Fadiga por competições recentes.
  const load = recentLoad(athlete, competition.date);
  p *= 1 / (1 + FATIGUE_WEIGHT * load);

  return Math.max(0.01, Math.min(0.97, p));
}

/** Comparador por ranking (pontos desc, desempate por rating). */
function byRanking(a, b) {
  if (b.ranking.points !== a.ranking.points) return b.ranking.points - a.ranking.points;
  return combatRating(b.attributes) - combatRating(a.attributes);
}

/**
 * Monta o campo de inscritos de uma categoria numa competição.
 * @returns {Array} atletas inscritos (limitados a fieldSize, por ranking).
 */
export function selectParticipants(world, competition, categoryId, random, opts = {}) {
  const fieldSize = opts.fieldSize ?? competition.fieldSize ?? DEFAULT_FIELD_SIZE;
  const minField = opts.minField ?? MIN_FIELD;
  const pool = athletesInCategory(world, categoryId);
  if (pool.length === 0) return [];
  const catSize = world.rankings[categoryId]?.athleteIds.length || pool.length;

  const willing = [];
  for (const a of pool) {
    if (random.chance(enterProbability(a, competition, catSize))) willing.push(a);
  }

  // Garante um campo mínimo preenchendo com os melhores ranqueados restantes.
  if (willing.length < minField) {
    const chosen = new Set(willing.map((a) => a.id));
    const rest = pool.filter((a) => !chosen.has(a.id)).sort(byRanking);
    for (const a of rest) {
      if (willing.length >= Math.min(minField, pool.length)) break;
      willing.push(a);
    }
  }

  willing.sort(byRanking);
  return fieldSize > 0 ? willing.slice(0, fieldSize) : willing;
}
