/**
 * Form System (#3 — periodização / pico de forma).
 *
 * A forma do atleta oscila por evento: a elite (top do ranking) chega em pico
 * nos eventos grandes e "desligada" nos pequenos; todos têm uma variação
 * aleatória ("forma do dia"). A forma vira um multiplicador TEMPORÁRIO sobre os
 * atributos, aplicado apenas àquele combate — os atributos permanentes não mudam
 * (combat_framework.md). Determinístico via RandomSystem. Ver DECISIONS.md.
 */

import { championPointsFor } from "../entities/competition.js";
import { clampAttribute, TECHNICAL, PHYSICAL, MENTAL } from "../config/attributes.js";

// --- Parâmetros (calibração — ajustável via FORM_CONFIG; ver TODO) ----------
export const FORM_BASELINE = 75; // forma neutra → multiplicador 1.0
export const FORM_CONFIG = {
  std: 11, // variação aleatória por evento ("forma do dia")
  peakBonus: 8, // elite em evento-alvo (grande)
  offPenalty: 13, // elite em evento pequeno ("treino de luxo")
  slope: 0.009, // quanto a forma escala os atributos
  elitePosition: 32, // quem periodiza (top do ranking)
  targetMinGrade: 40, // G-4+ é evento-alvo
};
// ----------------------------------------------------------------------------

/** True se o evento é "alvo" (grande) para um atleta de elite. */
export function isTargetEvent(competition) {
  return championPointsFor(competition.gRank) >= FORM_CONFIG.targetMinGrade;
}

/**
 * Forma do atleta para um evento (0–100).
 * @param {object} athlete
 * @param {object} competition
 * @param {import('../services/random.js').RandomSystem} random
 */
export function eventForm(athlete, competition, random) {
  const base = athlete.attributes.formaAtual ?? FORM_BASELINE;
  const pos = athlete.ranking?.position ?? Infinity;
  let periodization = 0;
  if (pos <= FORM_CONFIG.elitePosition) {
    periodization = isTargetEvent(competition) ? FORM_CONFIG.peakBonus : -FORM_CONFIG.offPenalty;
  }
  const variation = random.gaussian(0, FORM_CONFIG.std);
  return Math.max(20, Math.min(100, base + periodization + variation));
}

/** Multiplicador de atributos a partir da forma (forma 75 → 1.0). */
export function formMultiplier(form) {
  return 1 + (form - FORM_BASELINE) * FORM_CONFIG.slope;
}

/**
 * Retorna uma VISÃO do atleta com os atributos de combate escalados pela forma.
 * Preserva o id e os demais campos; não altera o atleta armazenado.
 */
export function formAdjustedAthlete(athlete, form) {
  const m = formMultiplier(form);
  const attributes = { ...athlete.attributes };
  for (const key of [...TECHNICAL, ...PHYSICAL, ...MENTAL]) {
    attributes[key] = Math.round(clampAttribute((athlete.attributes[key] ?? 0) * m));
  }
  return { ...athlete, attributes, _form: Math.round(form) };
}

/**
 * Constrói o mapa id → visão-ajustada-por-forma para os inscritos de um evento.
 * A forma é sorteada UMA vez por atleta (mesma em todas as lutas do evento).
 */
export function buildFightersWithForm(athletes, competition, random) {
  const map = new Map();
  for (const a of athletes) {
    map.set(a.id, formAdjustedAthlete(a, eventForm(a, competition, random)));
  }
  return map;
}
