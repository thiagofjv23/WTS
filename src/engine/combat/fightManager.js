/**
 * Fight Manager — orquestrador do combate (combat_framework.md / fight_algorithm.md).
 *
 * Coordena a ordem de execução das engines em cada troca, controla rounds e
 * encerra a luta. Não implementa regras específicas: delega a probability.js,
 * decision.js e rules.js. Determinístico: toda aleatoriedade vem do RandomSystem.
 *
 * A engine NÃO atualiza rankings, medalhas ou histórico — apenas produz o
 * resultado técnico da luta (fight_algorithm.md → Responsabilidades).
 */

import { createFightState } from "./fightState.js";
import {
  ACTIONS,
  COUNTER_ACTION,
  GAMJEOM_POINT,
  ROUNDS_TO_WIN,
  TOTAL_ROUNDS,
  roundWinner,
  matchDecided,
} from "./rules.js";
import {
  distanceControlProb,
  initiativeProb,
  landProb,
  defenseProb,
  counterProb,
  gamJeomProb,
  combatRating,
} from "./probability.js";
import { pickInitialPlan, chooseAction, adjustBehavior, PLANS } from "./decision.js";
import { TECHNICAL, PHYSICAL, MENTAL, clampAttribute } from "../../config/attributes.js";

const EXCHANGES_MIN = 12;
const EXCHANGES_MAX = 18;

// Rivalidade: variância extra (em %) aplicada aos atributos de cada lado no
// máximo de intensidade. Rivalidades tornam a luta mais imprevisível (o azarão
// cresce), sem favorecer ninguém em média. Ver docs/RIVALRIES.md.
const RIVALRY_ATTR_STD = 8;

/** Copia o atleta com uma perturbação aleatória nos atributos (por rivalidade). */
function rivalryAdjust(random, athlete, level) {
  const std = (RIVALRY_ATTR_STD * level) / 100;
  const factor = 1 + random.gaussian(0, std);
  const attributes = { ...athlete.attributes };
  for (const key of [...TECHNICAL, ...PHYSICAL, ...MENTAL]) {
    attributes[key] = Math.round(clampAttribute((athlete.attributes[key] ?? 0) * factor));
  }
  return { ...athlete, attributes };
}

/** Scoring Engine — única autorizada a mexer no placar (combat_framework.md). */
function applyScore(state, side, points, actionId) {
  state.roundScore[side] += points;
  const st = state.stats[side];
  st.points += points;
  if (actionId) st.byAction[actionId] = (st.byAction[actionId] || 0) + 1;
}

/** State Engine — energia, confiança e momentum (não altera atributos). */
function spendEnergy(sideState, cost) {
  // Resistência reduz o desgaste.
  const endurance = (sideState.attr.resistencia ?? 60) / 100;
  const drain = cost * (1.2 - 0.4 * endurance);
  sideState.energy = Math.max(0, sideState.energy - drain);
}

function shiftMomentum(state, favored, opposed, amount) {
  state[favored].momentum = Math.min(3, state[favored].momentum + amount);
  state[opposed].momentum = Math.max(-3, state[opposed].momentum - amount);
  state[favored].confidence = Math.min(100, state[favored].confidence + amount * 3);
  state[opposed].confidence = Math.max(0, state[opposed].confidence - amount * 3);
}

/** Recuperação parcial de energia entre rounds (atributo recuperacao). */
function recoverBetweenRounds(sideState) {
  const recovery = (sideState.attr.recuperacao ?? 60) / 100;
  sideState.energy = Math.min(100, sideState.energy + 25 + 25 * recovery);
  sideState.momentum = 0;
}

/** Uma troca de ações completa, na ordem oficial da Combat Framework. */
function runExchange(random, state) {
  // 1. Distância + iniciativa → quem ataca.
  const distA = distanceControlProb(state.A.attr, state.B.attr);
  const biasA = state.A.plan.offensiveBias;
  const biasB = state.B.plan.offensiveBias;
  const initA = initiativeProb(state.A, state.B, biasA, biasB);
  const attackerSide = random.chance((distA + initA) / 2) ? "A" : "B";
  const defenderSide = attackerSide === "A" ? "B" : "A";
  const attacker = state[attackerSide];
  const defender = state[defenderSide];

  // Penalidade (gam-jeom) do defensor pode dar ponto ao atacante.
  if (random.chance(gamJeomProb(defender))) {
    defender.gamJeom += 1;
    applyScore(state, attackerSide, GAMJEOM_POINT, null);
    shiftMomentum(state, attackerSide, defenderSide, 0.4);
  }

  // 2. Decisão da ação (apetite ao risco vem da situação atual do round).
  const risk = adjustBehavior(
    attacker,
    state.roundScore[defenderSide],
    state.roundScore[attackerSide]
  );
  const action = chooseAction(random, attacker, risk);
  attacker.plan = { ...attacker.plan, riskAppetite: risk };
  state.stats[attackerSide].attemptsTotal += 1;
  spendEnergy(attacker, action.cost);

  // 3. Resposta defensiva.
  const defended = random.chance(defenseProb(defender, attacker));
  if (defended) {
    state.stats[defenderSide].blocked += 1;
    // 4. Possível contra-ataque.
    if (random.chance(counterProb(defender, attacker))) {
      const landed = random.chance(landProb(defender, attacker, COUNTER_ACTION));
      if (landed) {
        applyScore(state, defenderSide, COUNTER_ACTION.points, COUNTER_ACTION.id);
        state.stats[defenderSide].counters += 1;
        state.stats[defenderSide].landed += 1;
        spendEnergy(defender, COUNTER_ACTION.cost);
        shiftMomentum(state, defenderSide, attackerSide, 0.6);
      }
    }
    return;
  }

  // 5. Ataque não defendido: verifica se acerta e pontua.
  if (random.chance(landProb(attacker, defender, action))) {
    applyScore(state, attackerSide, action.points, action.id);
    state.stats[attackerSide].landed += 1;
    shiftMomentum(state, attackerSide, defenderSide, 0.3 + action.points * 0.1);
  }
}

/** Desempate de round (golden exchange): favorece maior rating, com incerteza. */
function breakRoundTie(random, state) {
  const ratingA = combatRating(state.A.attr) + state.A.momentum;
  const ratingB = combatRating(state.B.attr) + state.B.momentum;
  const pA = ratingA / (ratingA + ratingB);
  return random.chance(pA) ? "A" : "B";
}

/** Simula um round completo e devolve o vencedor ("A"/"B"). */
function runRound(random, state) {
  state.roundScore.A = 0;
  state.roundScore.B = 0;
  const exchanges = random.int(EXCHANGES_MIN, EXCHANGES_MAX);
  for (let i = 0; i < exchanges; i++) runExchange(random, state);

  let winner = roundWinner(state.roundScore);
  if (winner === null) winner = breakRoundTie(random, state);
  state.roundsWon[winner] += 1;
  state.roundHistory.push({
    round: state.round,
    score: { A: state.roundScore.A, B: state.roundScore.B },
    winner: state[winner].id,
  });
  return winner;
}

/**
 * Simula uma luta completa entre dois atletas.
 * @param {import('../../services/random.js').RandomSystem} random
 * @param {object} athleteA
 * @param {object} athleteB
 * @param {object} [context]  { rivalry: nível 0..1 } — aumenta a variância.
 * @returns {object} resultado técnico da luta (winnerId, loserId, placar, stats)
 */
export function simulateFight(random, athleteA, athleteB, context = {}) {
  const level = context.rivalry || 0;
  let A = athleteA, B = athleteB;
  if (level > 0) {
    // Rivalidade: ambos entram "ligados" → mais variância nesta luta.
    A = rivalryAdjust(random, athleteA, level);
    B = rivalryAdjust(random, athleteB, level);
  }
  const plans = {
    A: pickInitialPlan(random, A.attributes),
    B: pickInitialPlan(random, B.attributes),
  };
  const state = createFightState(A, B, plans);

  for (let r = 1; r <= TOTAL_ROUNDS; r++) {
    state.round = r;
    runRound(random, state);
    recoverBetweenRounds(state.A);
    recoverBetweenRounds(state.B);
    if (matchDecided(state.roundsWon)) break;
  }

  const winnerSide = state.roundsWon.A > state.roundsWon.B ? "A" : "B";
  const loserSide = winnerSide === "A" ? "B" : "A";
  state.finished = true;
  state.winnerId = state[winnerSide].id;
  state.loserId = state[loserSide].id;

  return {
    winnerId: state.winnerId,
    loserId: state.loserId,
    roundsWon: { [athleteA.id]: state.roundsWon.A, [athleteB.id]: state.roundsWon.B },
    rounds: state.roundHistory,
    stats: {
      [athleteA.id]: state.stats.A,
      [athleteB.id]: state.stats.B,
    },
  };
}
