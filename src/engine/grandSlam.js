/**
 * Grand Slam — formato real de DOIS eventos de fim de ano.
 *
 *  1) Grand Slam Challenge (G-2): seletiva ABERTA, 2 dias antes das Finais.
 *     Sem limite de atletas; disputa de 3º lugar (um único bronze). Pontua no
 *     ranking normal (G-2). O campeão e o vice ganham WILDCARDS para as Finais —
 *     com a regra de "mesmo país": se os dois finalistas forem do mesmo país, a
 *     2ª vaga escorrega para o 3º (depois 4º…) até achar um atleta de outro país.
 *
 *  2) Grand Slam Finals: só 10 atletas VÁLIDOS por peso —
 *       - campeão e vice das 3 etapas do Grand Prix Series do ano (6),
 *       - campeão do Grand Prix Final (1),
 *       - Campeão Mundial vigente (1),
 *       - os 2 qualificados do Grand Slam Challenge (2).
 *     Chave de 16 com 6 byes; o campeão do GP Final e o Campeão Mundial são
 *     cabeças-de-chave (byes garantidos). Disputa de 3º lugar. Se um válido está
 *     lesionado, sua vaga passa ao 3º do Challenge.
 *
 *     As Finais NÃO pontuam no ranking normal: alimentam um "Ranking de Mérito
 *     Grand Slam" SEPARADO (1000/600/360/216/151/106), válido 2 anos com
 *     decaimento de 50%/ano, exibido APENAS na tela da competição.
 *
 * Só a partir de 2027 (quando o Mundial passa a existir e todos os classificados
 * vêm da simulação). Ver docs/GRAND_SLAM.md.
 */

import { createCompetition, COMPETITION_STATUS } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { athletesInCategory } from "../core/world.js";
import { combatRating } from "./combat/probability.js";
import { monthsBetween } from "../utils/dates.js";
import { isWorldChampionship } from "./worldChampionship.js";
import { ATHLETE_STATUS } from "../entities/athlete.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

/** Grau do Grand Slam Finals (rótulo; NÃO pontua no ranking normal). */
export const GRAND_SLAM_FINALS_GRANK = "G-12";
/** Grau da seletiva Grand Slam Challenge (pontua no ranking normal). */
export const GRAND_SLAM_CHALLENGE_GRANK = "G-2";
/** Atletas válidos por peso nas Finais. */
export const GRAND_SLAM_FINALS_FIELD = 10;
/** Tamanho da chave das Finais (10 válidos + 6 byes). */
export const GRAND_SLAM_BRACKET = 16;
/** 1ª edição do formato remodelado (o Mundial começa em 2027). */
export const GRAND_SLAM_FIRST_YEAR = 2027;
/** Local histórico do Grand Slam. */
const GRAND_SLAM_LOCATION = "Riyadh, Saudi Arabia";

/** Pontos do Ranking de Mérito por colocação nas Finais. */
export const GRAND_SLAM_MERIT_POINTS = { 1: 1000, 2: 600, 3: 360, 4: 216, 5: 151, 9: 106 };

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** É uma etapa do Grand Slam (Challenge OU Finals)? */
export function isGrandSlam(competition) {
  return /grand slam/i.test(competition?.name || "");
}

/** É o Grand Slam Challenge (seletiva aberta G-2)? */
export function isGrandSlamChallenge(competition) {
  return /grand slam challenge/i.test(competition?.name || "");
}

/** É o Grand Slam Finals (10 válidos, mérito)? */
export function isGrandSlamFinals(competition) {
  return /grand slam finals/i.test(competition?.name || "");
}

/**
 * Agenda o par Grand Slam do ano: Challenge (10/dez) e Finals (12/dez). Só a
 * partir de GRAND_SLAM_FIRST_YEAR.
 * @returns {{challenge: object, finals: object}|null}
 */
export function scheduleGrandSlam(world, idGen, opts = {}) {
  const { year, categoryFilter = MEN_IDS } = opts;
  if (year < GRAND_SLAM_FIRST_YEAR) return null;

  const challenge = createCompetition({
    id: idGen.next("COMP"),
    name: `WT Grand Slam Challenge ${year}`,
    gRank: GRAND_SLAM_CHALLENGE_GRANK,
    date: `${year}-12-10`,
    categoryIds: categoryFilter,
    location: GRAND_SLAM_LOCATION,
    fieldSize: 0, // aberto: sem limite de atletas
  });
  scheduleCompetition(world, idGen, challenge);

  const finals = createCompetition({
    id: idGen.next("COMP"),
    name: `WT Grand Slam Finals ${year}`,
    gRank: GRAND_SLAM_FINALS_GRANK,
    date: `${year}-12-12`,
    categoryIds: categoryFilter,
    location: GRAND_SLAM_LOCATION,
    fieldSize: GRAND_SLAM_BRACKET,
  });
  scheduleCompetition(world, idGen, finals);

  return { challenge, finals };
}

// ---- Consultas de resultados --------------------------------------------------

function countryCodeOf(world, athleteId) {
  const a = world.athletes[athleteId];
  return a ? world.countries[a.countryId]?.code || a.countryId : null;
}

function athleteAtPlacement(competition, categoryId, placement) {
  return (competition.results?.[categoryId] || []).find((p) => p.placement === placement)?.athleteId ?? null;
}

/** Comparador de atletas por ranking (pontos desc; desempate por rating). */
function byRanking(a, b) {
  if ((b.ranking?.points ?? 0) !== (a.ranking?.points ?? 0)) {
    return (b.ranking?.points ?? 0) - (a.ranking?.points ?? 0);
  }
  return combatRating(b.attributes) - combatRating(a.attributes);
}

/** Ordena as colocações do Challenge (colocação asc; desempate por ranking). */
function challengeOrder(world, placements) {
  return [...placements].sort((x, y) => {
    if (x.placement !== y.placement) return x.placement - y.placement;
    const ax = world.athletes[x.athleteId];
    const ay = world.athletes[y.athleteId];
    return (ay?.ranking?.points ?? 0) - (ax?.ranking?.points ?? 0);
  });
}

// ---- Grand Slam Challenge: qualificados --------------------------------------

/**
 * Resolve os 2 qualificados de uma categoria no Challenge (campeão + o próximo
 * de OUTRO país). Regra de mesmo país: se o vice for do país do campeão, a vaga
 * escorrega para o 3º, depois 4º… até um atleta de país diferente do campeão.
 * @returns {Array<string>} até 2 ids.
 */
export function grandSlamChallengeQualifiers(world, placements) {
  const order = challengeOrder(world, placements);
  if (!order.length) return [];
  const championId = order[0].athleteId;
  const champCountry = countryCodeOf(world, championId);
  const qualifiers = [championId];
  for (let i = 1; i < order.length && qualifiers.length < 2; i++) {
    const id = order[i].athleteId;
    if (countryCodeOf(world, id) !== champCountry) qualifiers.push(id);
  }
  return qualifiers;
}

/** Grava os qualificados do Challenge por categoria (consultados pelas Finais). */
export function grantGrandSlamChallengeQualifiers(world, competition, byCategory) {
  competition.grandSlamQualifiers = {};
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    competition.grandSlamQualifiers[categoryId] = grandSlamChallengeQualifiers(world, placements);
  }
  return competition.grandSlamQualifiers;
}

// ---- Grand Slam Finals: atletas válidos --------------------------------------

/**
 * Resolve os (até 10) atletas válidos das Finais numa categoria, JÁ na ordem de
 * seeding (campeão do GP Final = seed 1, Campeão Mundial = seed 2 — byes
 * garantidos; o restante por ranking).
 * @returns {Array<object>} atletas na ordem de seeding.
 */
export function resolveGrandSlamFinalists(world, competition, categoryId) {
  const year = competition.date.slice(0, 4);
  const comps = Object.values(world.competitions);

  const gpSeries = comps.filter(
    (c) => c.date.slice(0, 4) === year && c.gRank === "G-6" && /grand prix series/i.test(c.name)
  );
  const gpFinal = comps.find(
    (c) => c.date.slice(0, 4) === year && c.gRank === "G-10" && /grand prix final/i.test(c.name)
  );
  const challenge = comps.find((c) => c.date.slice(0, 4) === year && isGrandSlamChallenge(c));

  // Campeão Mundial vigente: campeão do Mundial mais recente concluído (<= data
  // das Finais, dentro de 2 anos — o Mundial é bienal).
  const worlds = comps
    .filter(
      (c) => isWorldChampionship(c) && c.date <= competition.date && c.status === COMPETITION_STATUS.FINISHED
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const worldsFresh = worlds && Number(year) - Number(worlds.date.slice(0, 4)) <= 2;

  const gpFinalChampId = gpFinal ? athleteAtPlacement(gpFinal, categoryId, 1) : null;
  const worldChampId = worldsFresh ? athleteAtPlacement(worlds, categoryId, 1) : null;

  // Conjunto de válidos (dedup, na ordem: cabeças-de-chave, GP Series, Challenge).
  const valid = [];
  const seen = new Set();
  const add = (id) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      valid.push(id);
    }
  };
  add(gpFinalChampId);
  add(worldChampId);
  for (const gp of gpSeries) {
    add(athleteAtPlacement(gp, categoryId, 1));
    add(athleteAtPlacement(gp, categoryId, 2));
  }
  for (const id of challenge?.grandSlamQualifiers?.[categoryId] || []) add(id);

  const isActive = (id) => world.athletes[id]?.status === ATHLETE_STATUS.ACTIVE;
  const field = valid.filter(isActive);
  const inField = new Set(field);

  // Lesão: a vaga do válido lesionado passa ao 3º do Challenge (e seguintes);
  // depois completa até 10 pelos melhores do ranking.
  if (field.length < GRAND_SLAM_FINALS_FIELD) {
    for (const p of challengeOrder(world, challenge?.results?.[categoryId] || [])) {
      if (field.length >= GRAND_SLAM_FINALS_FIELD) break;
      if (!inField.has(p.athleteId) && isActive(p.athleteId)) {
        field.push(p.athleteId);
        inField.add(p.athleteId);
      }
    }
  }
  if (field.length < GRAND_SLAM_FINALS_FIELD) {
    for (const a of athletesInCategory(world, categoryId).sort(byRanking)) {
      if (field.length >= GRAND_SLAM_FINALS_FIELD) break;
      if (!inField.has(a.id)) {
        field.push(a.id);
        inField.add(a.id);
      }
    }
  }

  const capped = field.slice(0, GRAND_SLAM_FINALS_FIELD);

  // Seeding: cabeças-de-chave forçados (byes), depois o restante por ranking.
  const head = [];
  if (gpFinalChampId && capped.includes(gpFinalChampId)) head.push(gpFinalChampId);
  if (worldChampId && worldChampId !== gpFinalChampId && capped.includes(worldChampId)) {
    head.push(worldChampId);
  }
  const rest = capped
    .filter((id) => !head.includes(id))
    .map((id) => world.athletes[id])
    .filter(Boolean)
    .sort(byRanking)
    .map((a) => a.id);

  return [...head, ...rest].map((id) => world.athletes[id]).filter(Boolean);
}

// ---- Ranking de Mérito Grand Slam --------------------------------------------

/** Pontos de mérito de uma colocação nas Finais (0 se não pontua). */
export function meritPointsFor(placement) {
  return GRAND_SLAM_MERIT_POINTS[placement] ?? 0;
}

/**
 * Fator de decaimento do mérito: 50%/ano, válido 2 anos.
 * ano 0 = 100% · ano 1 = 50% · ano 2+ = 0%.
 */
export function meritDecayFactor(months) {
  const years = Math.floor(months / 12);
  const table = [1, 0.5];
  return years < table.length ? table[years] : 0;
}

/**
 * Aplica os pontos de mérito das Finais ao ledger separado (world.grandSlamMerit)
 * e anota entry.meritPoints em cada colocação. Também grava os resultados.
 */
export function applyGrandSlamMerit(world, competition, byCategory) {
  world.grandSlamMerit ||= [];
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    for (const entry of placements) {
      const pts = meritPointsFor(entry.placement);
      entry.meritPoints = pts;
      if (pts > 0) {
        world.grandSlamMerit.push({
          date: competition.date,
          athleteId: entry.athleteId,
          categoryId,
          points: pts,
          competitionId: competition.id,
        });
      }
    }
    competition.results[categoryId] = placements;
  }
}

/**
 * Ranking de Mérito Grand Slam de uma categoria na data de referência (aplica o
 * decaimento de 50%/ano sobre a janela de 2 anos). Ordenado por pontos desc.
 * @returns {Array<{athleteId: string, points: number}>}
 */
export function grandSlamMeritRanking(world, categoryId, refDate) {
  const byAthlete = new Map();
  for (const e of world.grandSlamMerit || []) {
    if (e.categoryId !== categoryId) continue;
    const decay = meritDecayFactor(monthsBetween(e.date, refDate));
    if (decay <= 0) continue;
    byAthlete.set(e.athleteId, (byAthlete.get(e.athleteId) || 0) + e.points * decay);
  }
  return [...byAthlete.entries()]
    .map(([athleteId, points]) => ({ athleteId, points: round2(points) }))
    .sort((a, b) => b.points - a.points);
}
