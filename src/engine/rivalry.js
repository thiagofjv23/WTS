/**
 * Rivalry System — rivalidades esportivas entre atletas.
 *
 * Guarda um AGREGADO minúsculo por par (não o log de lutas): quantos encontros
 * decisivos (finais/semifinais), retrospecto, e uma "intensidade" acumulada.
 * A intensidade cresce mais em GRANDES eventos (Mundial/Olimpíadas valem muito
 * mais que um Open) e ESFRIA com o tempo (decaimento por meia-vida).
 *
 * Quando dois rivais se enfrentam, ambos entram com mais "gana": maior confiança
 * inicial e MAIOR variância no combate — clássicos de rivalidade são mais
 * imprevisíveis (o azarão cresce). Ver docs/RIVALRIES.md.
 */

import { championPointsFor } from "../entities/competition.js";
import { monthsBetween } from "../utils/dates.js";

// --- Parâmetros (calibração — ver docs/RIVALRIES.md) ------------------------
// Só encontros em fases decisivas criam rivalidade (round <= SEMI).
const ROUND_FACTOR = { 2: 3.0, 4: 2.0 }; // final=3, semifinal=2
// Peso do evento: championPoints/10 → G-1=1, G-4=4, G-6=6, G-10=10, G-20=20.
const EVENT_DIVISOR = 10;
// Meia-vida da intensidade (a rivalidade cai pela metade a cada N meses sem se
// encontrarem).
const HALF_LIFE_MONTHS = 30;
// Intensidade que corresponde a "rivalidade máxima" (normalização 0..1).
const FULL_INTENSITY = 40;
// Abaixo disto, a rivalidade é considerada irrelevante (poda). Calibrado para
// que um único encontro em evento pequeno (G-1/G-2 semi) NÃO vire rivalidade —
// só encontros grandes ou repetidos permanecem.
const MIN_INTENSITY = 4;
// ----------------------------------------------------------------------------

/** Chave canônica de um par (independe da ordem dos ids). */
export function pairKey(aId, bId) {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

/** Fator de decaimento por meia-vida em `months`. */
function decay(months) {
  if (months <= 0) return 1;
  return Math.pow(0.5, months / HALF_LIFE_MONTHS);
}

/** Intensidade da rivalidade decaída até `atDate` (0 se não houver). */
export function rivalryIntensity(world, aId, bId, atDate) {
  const r = world.rivalries[pairKey(aId, bId)];
  if (!r) return 0;
  return r.intensity * decay(monthsBetween(r.lastDate, atDate));
}

/** Nível normalizado 0..1 (para o efeito no combate e na UI). */
export function rivalryLevel(intensity) {
  return Math.max(0, Math.min(1, intensity / FULL_INTENSITY));
}

/**
 * Atualiza as rivalidades a partir das lutas DECISIVAS de uma competição.
 * (Consequence phase — simulation_director §9.)
 */
export function updateRivalriesFromCompetition(world, competition, allMatches) {
  const eventFactor = championPointsFor(competition.gRank) / EVENT_DIVISOR;
  const date = competition.date;
  for (const m of allMatches) {
    const roundFactor = ROUND_FACTOR[m.round];
    if (!roundFactor) continue; // só final/semifinal criam rivalidade
    const weight = roundFactor * eventFactor;
    const key = pairKey(m.athleteAId, m.athleteBId);
    let r = world.rivalries[key];
    if (!r) {
      r = {
        aId: m.athleteAId, bId: m.athleteBId,
        meetings: 0, decisive: 0, intensity: 0,
        h2h: { [m.athleteAId]: 0, [m.athleteBId]: 0 },
        lastDate: date, lastGRank: competition.gRank,
      };
      world.rivalries[key] = r;
    } else {
      // Esfria antes de somar (decaimento desde o último encontro).
      r.intensity *= decay(monthsBetween(r.lastDate, date));
    }
    r.intensity += weight;
    r.meetings += 1;
    r.decisive += 1;
    r.h2h[m.winnerId] = (r.h2h[m.winnerId] || 0) + 1;
    r.lastDate = date;
    r.lastGRank = competition.gRank;
  }
}

/** Remove rivalidades cuja intensidade decaiu abaixo do mínimo. */
export function pruneRivalries(world, atDate) {
  for (const [key, r] of Object.entries(world.rivalries)) {
    if (r.intensity * decay(monthsBetween(r.lastDate, atDate)) < MIN_INTENSITY) {
      delete world.rivalries[key];
    }
  }
}

/** Lista as rivalidades de um atleta (decaídas), mais intensas primeiro. */
export function rivalsOf(world, athleteId, atDate, limit = 6) {
  const out = [];
  for (const r of Object.values(world.rivalries)) {
    if (r.aId !== athleteId && r.bId !== athleteId) continue;
    const oppId = r.aId === athleteId ? r.bId : r.aId;
    const intensity = r.intensity * decay(monthsBetween(r.lastDate, atDate));
    if (intensity < MIN_INTENSITY) continue;
    out.push({
      opponentId: oppId,
      intensity,
      level: rivalryLevel(intensity),
      meetings: r.meetings,
      decisive: r.decisive,
      wins: r.h2h[athleteId] || 0,
      losses: r.h2h[oppId] || 0,
      lastDate: r.lastDate,
      lastGRank: r.lastGRank,
    });
  }
  return out.sort((a, b) => b.intensity - a.intensity).slice(0, limit);
}
