/**
 * Eligibility System — travas de elegibilidade das competições.
 * Fonte: "Estrutura Competitiva e Dinâmica de Ranking do Taekwondo Mundial".
 *
 * Classifica cada evento e decide quem PODE se inscrever (antes da decisão
 * voluntária de participação). Não decide resultados. Ver DECISIONS.md.
 *
 * Regras:
 *  - Grand Prix Series (G-6): só top 32 do ranking; Final (G-10): só top 16.
 *  - Campeonatos continentais (G-4): só atletas do continente + 1 por país
 *    (mais os agraciados por wildcard da President's Cup — ver wildcards.js).
 *  - President's Cup (G-3): restrito ao continente do nome (fechada ao
 *    continente); dá vaga extra (wildcard) para o continental — ver wildcards.js.
 *  - Eventos "Arab": só países árabes.
 *  - Mundial (G-14): 1 por país (sem trava de ranking).
 */

import { continentOf, isArab } from "../config/continents.js";
import { combatRating } from "./combat/probability.js";

/** Detecta o continente citado no nome do evento. */
function detectContinent(name) {
  if (/pan.?american|pan am\b/i.test(name)) return "PAM";
  if (/european|europe\b/i.test(name)) return "EUR";
  if (/african|africa\b/i.test(name)) return "AFR";
  if (/oceania/i.test(name)) return "OCE";
  if (/asian|asia\b/i.test(name)) return "ASI";
  return null;
}

/**
 * Classifica as travas de um evento.
 * @returns {{ rankingLockTopN: number|null, continent: string|null,
 *   arabOnly: boolean, nationalLimit: number|null, invitational: boolean }}
 */
export function classifyEvent(competition) {
  const name = competition.name || "";
  const g = competition.gRank;
  const rules = {
    rankingLockTopN: null,
    continent: null,
    arabOnly: false,
    nationalLimit: null,
    invitational: false,
  };

  if (g === "G-6") rules.rankingLockTopN = 32;
  else if (g === "G-10") rules.rankingLockTopN = 16;
  else if (g === "G-14") rules.nationalLimit = 1; // Mundial

  // Grand Slam Finals: campo resolvido externamente (10 válidos) — por convite,
  // sem trava de ranking. O Grand Slam Challenge é uma seletiva ABERTA (G-2, sem
  // trava): comporta-se como um Open normal, então não recebe regra especial aqui.
  const grandSlamFinals = /grand slam finals/i.test(name);

  if (/arab/i.test(name)) rules.arabOnly = true;

  // Campeonatos/Jogos continentais (G-4): continente + limite nacional.
  if (g === "G-4" && /(championship|games)/i.test(name)) {
    const c = detectContinent(name);
    if (c) {
      rules.continent = c;
      rules.nationalLimit = 1;
    }
  }
  // President's Cup (G-3): restrito ao continente.
  if (g === "G-3" && /president'?s cup/i.test(name)) {
    const c = detectContinent(name);
    if (c) rules.continent = c;
  }

  // Eventos por convite/representação: elegíveis comparecem sem sorteio. As
  // Finais do Grand Slam também são por convite (campo dos 10 válidos).
  rules.invitational =
    rules.rankingLockTopN !== null || rules.nationalLimit !== null || grandSlamFinals;
  return rules;
}

/** True se o atleta é elegível para o evento segundo as travas duras. */
export function isEligible(athlete, world, rules) {
  const country = world.countries[athlete.countryId];
  const ioc = country ? country.code : null;
  if (rules.arabOnly && !isArab(ioc)) return false;
  if (rules.continent && continentOf(ioc) !== rules.continent) return false;
  if (rules.rankingLockTopN) {
    const pos = athlete.ranking.position;
    if (pos == null || pos > rules.rankingLockTopN) return false;
  }
  return true;
}

function byRanking(a, b) {
  if (b.ranking.points !== a.ranking.points) return b.ranking.points - a.ranking.points;
  return combatRating(b.attributes) - combatRating(a.attributes);
}

/** Mantém no máximo `limit` atletas por país (os melhores ranqueados). */
export function applyNationalLimit(athletes, world, limit) {
  const perCountry = new Map();
  const out = [];
  for (const a of [...athletes].sort(byRanking)) {
    const code = world.countries[a.countryId]?.code || a.countryId;
    const count = perCountry.get(code) || 0;
    if (count < limit) {
      perCountry.set(code, count + 1);
      out.push(a);
    }
  }
  return out;
}
