/**
 * Wildcards da President's Cup.
 * Fonte: "Estrutura Competitiva e Dinâmica de Ranking do Taekwondo Mundial"
 * (a President's Cup dá vagas extras diretas para o Campeonato Continental,
 * exclusivas para atletas daquele continente).
 *
 * Regra implementada:
 *  - O Campeonato Continental leva 1 representante por país (o melhor ranqueado
 *    de cada país naquele peso). O WILDCARD é a ÚNICA forma de um país ter DOIS
 *    atletas no continental.
 *  - Cada President's Cup concede 1 wildcard por categoria para o PRÓXIMO
 *    continental do mesmo continente. O agraciado é o campeão; se ele já for o
 *    nº 1 do seu país (já entraria como representante nacional), a vaga passa ao
 *    vice, depois ao 3º que perdeu para o campeão, e assim por diante até achar
 *    um atleta elegível (que não seja o nº 1 do seu país).
 *  - A President's Cup já é restrita ao continente (ver eligibility.js), então o
 *    agraciado é sempre do continente — elegível para o continental.
 *
 * Determinístico e barato: guardamos só a ordem de classificação (ids) por
 * President's Cup; wildcards são consumidos/expirados em ~1 ano (não acumulam).
 */

import { athletesInCategory } from "../core/world.js";
import { classifyEvent, isEligible, applyNationalLimit } from "./eligibility.js";
import { continentOf } from "../config/continents.js";

// Validade máxima de um wildcard não consumido (segurança; ~1 ano + folga).
const MAX_AGE_DAYS = 450;

/** É uma President's Cup (com continente detectado)? */
export function isPresidentsCup(competition) {
  const rules = classifyEvent(competition);
  return /president'?s cup/i.test(competition.name || "") && !!rules.continent;
}

/** É um Campeonato Continental (continente + 1 por país)? */
export function isContinentalChampionship(competition) {
  const rules = classifyEvent(competition);
  return !!rules.continent && rules.nationalLimit === 1;
}

/**
 * Concede os wildcards de uma President's Cup (chamado na fase de consequência).
 * Guarda, por categoria, a ORDEM de classificação já resolvida (campeão →
 * vice → quem perdeu para o campeão → …) para o continental resolver o agraciado.
 * @param {Array} allMatches lutas do evento (para saber quem eliminou quem).
 */
export function grantPresidentsCupWildcards(world, competition, byCategory, allMatches = []) {
  const rules = classifyEvent(competition);
  if (!isPresidentsCup(competition)) return [];

  // Mapa: quem venceu cada perdedor (para ordenar "perdeu para o campeão" antes).
  const beatenBy = new Map();
  for (const m of allMatches) {
    const loserId = m.winnerId === m.athleteAId ? m.athleteBId : m.athleteAId;
    if (loserId) beatenBy.set(loserId, m.winnerId);
  }

  const granted = [];
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    const placementOf = new Map(placements.map((p) => [p.athleteId, p.placement]));
    const candidates = [...placements]
      .sort((a, b) => {
        if (a.placement !== b.placement) return a.placement - b.placement;
        // Empate de colocação (ex.: dois bronzes): quem perdeu para o mais bem
        // colocado vem primeiro ("o 3º que perdeu para o campeão").
        const ea = placementOf.get(beatenBy.get(a.athleteId)) ?? 0;
        const eb = placementOf.get(beatenBy.get(b.athleteId)) ?? 0;
        if (ea !== eb) return ea - eb;
        const aa = world.athletes[a.athleteId];
        const bb = world.athletes[b.athleteId];
        return (bb?.ranking.points ?? 0) - (aa?.ranking.points ?? 0);
      })
      .map((p) => p.athleteId);

    const wc = {
      continent: rules.continent,
      categoryId,
      sourceCompetitionId: competition.id,
      sourceName: competition.name,
      date: competition.date,
      candidates,
    };
    world.wildcards.push(wc);
    granted.push(wc);
  }
  return granted;
}

/** Conjunto de ids dos representantes nacionais (1º de cada país) do continental. */
function nationalRepIds(world, competition, categoryId, rules) {
  const eligible = athletesInCategory(world, categoryId).filter((a) => isEligible(a, world, rules));
  const reps = applyNationalLimit(eligible, world, rules.nationalLimit);
  return new Set(reps.map((a) => a.id));
}

/**
 * Resolve os agraciados por wildcard para um continental+categoria (sem
 * consumir). Percorre a ordem de classificação de cada President's Cup pendente
 * e escolhe o 1º atleta ativo que NÃO seja o representante nacional (nº 1 do
 * país) — a "única forma de um país ter dois atletas".
 * @returns {Array<string>} ids dos agraciados (normalmente 1).
 */
export function wildcardEntrantsFor(world, competition, categoryId) {
  if (!isContinentalChampionship(competition)) return [];
  const rules = classifyEvent(competition);
  const pending = (world.wildcards || []).filter(
    (w) => w.continent === rules.continent && w.categoryId === categoryId && w.date < competition.date
  );
  if (!pending.length) return [];

  const reps = nationalRepIds(world, competition, categoryId, rules);
  const chosen = new Set();
  const out = [];
  for (const w of pending) {
    for (const id of w.candidates) {
      const a = world.athletes[id];
      if (!a || a.status !== "ativo" || a.weightCategoryId !== categoryId) continue;
      if (continentOf(world.countries[a.countryId]?.code) !== rules.continent) continue;
      if (reps.has(id) || chosen.has(id)) continue; // já é o nº 1 do país (ou já escolhido)
      chosen.add(id);
      out.push(id);
      break;
    }
  }
  return out;
}

/**
 * Consome (remove) os wildcards pendentes de um continente ao rodar o continental
 * daquele continente, e poda os expirados. Chamado após o evento.
 */
export function consumeWildcards(world, competition) {
  const rules = classifyEvent(competition);
  const continent = isContinentalChampionship(competition) ? rules.continent : null;
  const cutoff = competition.date;
  world.wildcards = (world.wildcards || []).filter((w) => {
    // Consome os do continente deste continental (já tiveram sua vez).
    if (continent && w.continent === continent && w.date < cutoff) return false;
    // Poda por idade (segurança, caso um continental não tenha rodado).
    if (daysApart(w.date, cutoff) > MAX_AGE_DAYS) return false;
    return true;
  });
}

function daysApart(fromISO, toISO) {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86400000);
}
