/**
 * Ranking System — pontos por colocação e recálculo das classificações.
 * Baseado em taekwondo-ranking.md §1–§2. O ranking é sempre DERIVADO dos
 * resultados (SimulationRules §4), nunca editado à mão.
 *
 * Distribuição por colocação (§2), como fração do valor do G-Rank:
 *   1º=100% · 2º=60% · 3º=36% · 5º=21.6% · 9º=15.12%.
 * Observação: a progressão não é geométrica pura (o passo 5º→9º é ×0.7, não
 * ×0.6); por isso usamos a TABELA explícita do documento. Para colocações mais
 * profundas que 9º (17º+, em chaves de 32) estendemos com ×0.7 — suposição a
 * confirmar (ver DECISIONS.md/TODO.md).
 *
 * Decaimento temporal de 4 anos (§5): cada resultado perde valor a cada
 * aniversário — 100% / 75% / 50% / 25% / 0% após 4 anos. Os pontos de ranking
 * são calculados a partir de um LEDGER de resultados (athlete.pointsLedger),
 * aplicando o fator de decaimento sobre a data atual do mundo. Desempate
 * avançado (§3) segue adiado (TODO.md) — desempatamos por rating.
 */

import { championPointsFor } from "../entities/competition.js";
import { combatRating } from "./combat/probability.js";
import { monthsBetween } from "../utils/dates.js";

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** Fator de decaimento (§5) pelo nº de meses desde o evento. */
export function decayFactor(months) {
  const years = Math.floor(months / 12);
  const table = [1, 0.75, 0.5, 0.25];
  return years < table.length ? table[years] : 0;
}

/**
 * Quantos resultados contam para o ranking (regra "melhores N resultados" da WT).
 * Calibrado para totais de topo realistas (~200–350 pts). Ver DECISIONS.md/TODO.
 */
export const BEST_N = 5;

/**
 * Pontos de ranking efetivos de um atleta na data do mundo: aplica o decaimento
 * a cada resultado do ledger e soma apenas os BEST_N maiores (regra best-N).
 */
export function effectivePoints(athlete, worldDate, bestN = BEST_N) {
  const ledger = athlete.pointsLedger || [];
  const decayed = [];
  for (const e of ledger) {
    const v = e.points * decayFactor(monthsBetween(e.date, worldDate));
    if (v > 0) decayed.push(v);
  }
  decayed.sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < Math.min(bestN, decayed.length); i++) total += decayed[i];
  return round2(total);
}

/** Fatores de premiação por degrau, conforme taekwondo-ranking.md §2. */
const PLACEMENT_FACTORS = [1, 0.6, 0.36, 0.216, 0.1512];
const DEEP_RATIO = 0.7; // extensão para degraus além do 9º

/**
 * Índice do degrau de premiação para uma colocação (1→0, 2→1, 3→2, 5→3, 9→4…).
 * As colocações vêm da eliminação simples: 1, 2, 3, 5, 9, 17, ...
 */
export function placementTier(placement) {
  if (placement <= 1) return 0;
  if (placement === 2) return 1;
  return Math.log2(placement - 1) + 1;
}

/** Fator de premiação para um degrau (estende com ×0.7 além do 9º). */
export function placementFactor(placement) {
  const tier = placementTier(placement);
  if (tier < PLACEMENT_FACTORS.length) return PLACEMENT_FACTORS[tier];
  let factor = PLACEMENT_FACTORS[PLACEMENT_FACTORS.length - 1];
  for (let t = PLACEMENT_FACTORS.length; t <= tier; t++) factor *= DEEP_RATIO;
  return factor;
}

/** Pontos de ranking ganhos por uma colocação numa competição de dado G-Rank. */
export function pointsForPlacement(gRankKey, placement) {
  return round2(championPointsFor(gRankKey) * placementFactor(placement));
}

/**
 * Aplica os resultados de uma competição ao ledger dos atletas.
 * Registra rankingPointsEarned em cada colocação e adiciona a entrada ao ledger
 * (com a data da competição, para o decaimento futuro). Não mexe diretamente em
 * ranking.points — isso é responsabilidade de recomputeRankings.
 * @returns {number} total de pontos distribuídos (para verificação/testes).
 */
export function applyCompetitionPoints(world, competition, byCategory) {
  let distributed = 0;
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    for (const entry of placements) {
      const pts = pointsForPlacement(competition.gRank, entry.placement);
      entry.rankingPointsEarned = pts;
      const athlete = world.athletes[entry.athleteId];
      if (athlete) {
        (athlete.pointsLedger ||= []).push({
          date: competition.date,
          points: pts,
          gRank: competition.gRank,
          competitionId: competition.id,
        });
        distributed += pts;
      }
    }
    // Guarda os resultados oficiais na competição (permanentes).
    competition.results[categoryId] = placements;
  }
  return round2(distributed);
}

/**
 * Recalcula os pontos efetivos (com decaimento) e as posições por categoria.
 * Atualiza athlete.ranking.points/position e world.rankings[categoryId].
 */
export function recomputeRankings(world, worldDate) {
  const date = worldDate ?? world.state.currentDate;
  const byCategory = {};
  for (const athlete of Object.values(world.athletes)) {
    if (athlete.status === "aposentado") continue;
    athlete.ranking.points = effectivePoints(athlete, date);
    (byCategory[athlete.weightCategoryId] ||= []).push(athlete);
  }
  for (const [categoryId, list] of Object.entries(byCategory)) {
    list.sort((a, b) => {
      if (b.ranking.points !== a.ranking.points) {
        return b.ranking.points - a.ranking.points;
      }
      return combatRating(b.attributes) - combatRating(a.attributes);
    });
    list.forEach((athlete, i) => {
      athlete.ranking.position = i + 1;
    });
    world.rankings[categoryId] = {
      categoryId,
      athleteIds: list.map((a) => a.id),
      lastUpdated: date,
    };
  }
}
