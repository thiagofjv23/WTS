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
 * Decaimento temporal de 4 anos (§5) e desempate avançado (§3) ficam adiados
 * (TODO.md); aqui somamos pontos brutos e desempatamos por rating.
 */

import { G_RANKS } from "../entities/competition.js";
import { combatRating } from "./combat/probability.js";

function round2(v) {
  return Math.round(v * 100) / 100;
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
  const g = G_RANKS[gRankKey];
  if (!g) throw new Error(`G-Rank inválido: ${gRankKey}`);
  return round2(g.championPoints * placementFactor(placement));
}

/**
 * Aplica os resultados de uma competição ao ranking dos atletas.
 * Credita pontos e registra rankingPointsEarned em cada colocação (in-place).
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
        athlete.ranking.points = round2(athlete.ranking.points + pts);
        distributed += pts;
      }
    }
    // Guarda os resultados oficiais na competição (permanentes).
    competition.results[categoryId] = placements;
  }
  return round2(distributed);
}

/**
 * Recalcula as posições de ranking por categoria a partir dos pontos.
 * Atualiza athlete.ranking.position e world.rankings[categoryId].
 */
export function recomputeRankings(world, worldDate) {
  const byCategory = {};
  for (const athlete of Object.values(world.athletes)) {
    if (athlete.status === "aposentado") continue;
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
      lastUpdated: worldDate ?? world.state.currentDate,
    };
  }
}
