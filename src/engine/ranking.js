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
 * Teto anual de pontos vindos de eventos G-1 e G-2 (regra do Point Cap da WT).
 * Eventos G-3+ não têm teto. Ver DECISIONS.md.
 */
export const G12_ANNUAL_CAP = 40;

/** Grades sujeitos ao teto anual. */
const CAPPED_GRANKS = new Set(["G-1", "G-2"]);

/**
 * Pontos de ranking efetivos de um atleta na data do mundo:
 *  - aplica o decaimento (§5) a cada resultado do ledger;
 *  - limita a soma dos resultados G-1/G-2 a G12_ANNUAL_CAP por ANO (contando os
 *    de maior valor primeiro); G-3+ e o seed entram sem teto.
 */
export function effectivePoints(athlete, worldDate) {
  const ledger = athlete.pointsLedger || [];
  const smallByYear = new Map(); // ano → [{ points, decay }]
  let total = 0;

  for (const e of ledger) {
    const decay = decayFactor(monthsBetween(e.date, worldDate));
    if (decay <= 0) continue;
    if (CAPPED_GRANKS.has(e.gRank)) {
      const year = e.date.slice(0, 4);
      if (!smallByYear.has(year)) smallByYear.set(year, []);
      smallByYear.get(year).push({ points: e.points, decay });
    } else {
      total += e.points * decay; // G-3+ e seed: sem teto
    }
  }

  // Aplica o teto anual por ano, contando os melhores resultados até 40 (nominal)
  // e aplicando o decaimento à parcela contada.
  for (const list of smallByYear.values()) {
    list.sort((a, b) => b.points - a.points);
    let acc = 0;
    for (const e of list) {
      if (acc >= G12_ANNUAL_CAP) break;
      const counted = Math.min(e.points, G12_ANNUAL_CAP - acc);
      acc += counted;
      total += counted * e.decay;
    }
  }

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
