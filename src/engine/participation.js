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
import { classifyEvent, isEligible, applyNationalLimit } from "./eligibility.js";
import { continentOf } from "../config/continents.js";
import { eventForm } from "./form.js";
import {
  profileForRank,
  PROFILE_PARAMS,
  openScore,
  openPointsThisYear,
  openEntriesThisQuarter,
  OPEN_POINTS_CAP,
} from "./athleteProfile.js";
import { resolveHostRegion } from "./tournamentRegion.js";

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

  // 1. Travas duras de elegibilidade (continente, árabe, lock de ranking).
  const rules = classifyEvent(competition);
  let eligible = pool.filter((a) => isEligible(a, world, rules));
  // 2. Limite nacional (1 por país nos continentais/mundial).
  if (rules.nationalLimit) eligible = applyNationalLimit(eligible, world, rules.nationalLimit);
  // 2b. Wildcards da President's Cup (resolvidos pelo Director e gravados no
  // evento): entram ALÉM do limite de 1 por país — única forma de um país ter
  // dois atletas no continental.
  const wildcardIds = competition.wildcards?.[categoryId];
  if (wildcardIds?.length) {
    const present = new Set(eligible.map((a) => a.id));
    for (const id of wildcardIds) {
      const a = world.athletes[id];
      if (a && !present.has(id)) {
        eligible.push(a);
        present.add(id);
      }
    }
  }
  if (eligible.length === 0) return [];

  // Opens comuns (G-1/G-2): decisão de calendário por PERFIL (urgência + distância
  // + forma) e campo com prioridade nacional/continental. Ver athleteProfile.js.
  if (isRegularOpen(competition, rules)) {
    return selectOpenField(world, competition, random, eligible, fieldSize, minField);
  }

  let field;
  if (rules.invitational) {
    // Eventos por convite/representação: os elegíveis comparecem.
    field = eligible;
  } else {
    // 3. Decisão voluntária de participação (grau/ranking + fadiga).
    const catSize = world.rankings[categoryId]?.athleteIds.length || pool.length;
    field = eligible.filter((a) => random.chance(enterProbability(a, competition, catSize)));
    // Campo mínimo: completa com os melhores elegíveis restantes.
    if (field.length < Math.min(minField, eligible.length)) {
      const chosen = new Set(field.map((a) => a.id));
      const rest = eligible.filter((a) => !chosen.has(a.id)).sort(byRanking);
      for (const a of rest) {
        if (field.length >= Math.min(minField, eligible.length)) break;
        field.push(a);
      }
    }
  }

  field.sort(byRanking);
  return fieldSize > 0 ? field.slice(0, fieldSize) : field;
}

/**
 * É um Open comum (G-1/G-2) sujeito à decisão por perfil? Exclui o Grand Slam
 * Challenge (G-2 especial, aberto a todos) e eventos por convite.
 */
export function isRegularOpen(competition, rules) {
  const g = competition.gRank;
  if (g !== "G-1" && g !== "G-2") return false;
  if (rules?.invitational) return false;
  if (/grand slam challenge/i.test(competition.name || "")) return false;
  return true;
}

/** Probabilidade de um atleta entrar num Open, dado perfil, Score e forma. */
function openEntryProbability(profile, score, tournamentPts, form) {
  const base = PROFILE_PARAMS[profile]?.baseInterest ?? 0.3;
  const scoreFactor = Math.max(0, Math.min(1, score / tournamentPts)); // 0..1
  // Forma do dia espalha quem entra em cada Open (evita corrida ao 1º do ano).
  const formFactor = Math.max(0.05, Math.min(1, (form - 45) / 45));
  const p = base * (0.35 + 0.65 * scoreFactor) * (0.25 + 0.75 * formFactor);
  return Math.max(0.01, Math.min(0.97, p));
}

/**
 * Monta o campo de um Open: decide QUEM quer entrar (perfil + Score + forma,
 * respeitando o teto de 40 e a cota trimestral) e compõe com prioridade
 * nacional/continental. Ver docs/ATHLETE_PROFILE.md.
 */
function selectOpenField(world, competition, random, eligible, fieldSize, minField) {
  const year = competition.date.slice(0, 4);
  const host = resolveHostRegion(world, competition);
  const pts = championPointsFor(competition.gRank);
  const contOf = (a) => continentOf(world.countries[a.countryId]?.code);

  const interested = [];
  const gatePassers = []; // passaram nas travas mas não no sorteio (reserva p/ campo mínimo)
  for (const a of eligible) {
    const profile = profileForRank(a.ranking?.position);
    if (openPointsThisYear(a, year) >= OPEN_POINTS_CAP) continue; // já bateu o teto
    if (openEntriesThisQuarter(a, competition.date) >= PROFILE_PARAMS[profile].quarterQuota) continue;
    const score = openScore(profile, pts, contOf(a), host?.continent);
    if (score <= 0) continue; // distância inviabiliza (Local não cruza continente)
    gatePassers.push({ a, score });
    const form = eventForm(a, competition, random);
    if (random.chance(openEntryProbability(profile, score, pts, form))) interested.push(a);
  }

  // Campo mínimo: completa com quem passou nas travas (maior Score primeiro), sem
  // reintroduzir a elite (que raramente tem Score alto em Opens).
  if (interested.length < Math.min(minField, gatePassers.length)) {
    const chosen = new Set(interested.map((a) => a.id));
    for (const { a } of gatePassers.sort((x, y) => y.score - x.score)) {
      if (interested.length >= Math.min(minField, gatePassers.length)) break;
      if (!chosen.has(a.id)) {
        interested.push(a);
        chosen.add(a.id);
      }
    }
  }

  return composeOpenField(world, competition, host, interested, fieldSize);
}

/**
 * Compõe o campo de um Open com prioridade:
 *  - G-1: atletas da NACIONALIDADE do torneio primeiro, depois os demais;
 *  - G-2: reserva 50% para a nacionalidade e ≥15% para o continente; o resto é
 *    aberto e as vagas não preenchidas por essas cotas passam aos demais.
 */
function composeOpenField(world, competition, host, interested, fieldSize) {
  const N = fieldSize > 0 ? Math.min(fieldSize, interested.length) : interested.length;
  const pool = [...interested].sort(byRanking);
  const codeOf = (a) => world.countries[a.countryId]?.code;
  const isHost = (a) => host && codeOf(a) === host.code;
  const isCont = (a) => host && !isHost(a) && continentOf(codeOf(a)) === host.continent;

  if (competition.gRank === "G-1") {
    const nationals = pool.filter(isHost);
    const others = pool.filter((a) => !isHost(a));
    return [...nationals, ...others].slice(0, N);
  }

  // G-2: cotas nacional (50%) e continental (15%), depois abre para todos.
  const field = [];
  const added = new Set();
  const take = (list, quota) => {
    let n = quota;
    for (const a of list) {
      if (field.length >= N || n <= 0) break;
      if (!added.has(a.id)) {
        field.push(a);
        added.add(a.id);
        n -= 1;
      }
    }
  };
  take(pool.filter(isHost), Math.ceil(0.5 * N));
  take(pool.filter(isCont), Math.ceil(0.15 * N));
  take(pool, N); // completa com os melhores restantes (libera cotas não usadas)
  return field.slice(0, N);
}
