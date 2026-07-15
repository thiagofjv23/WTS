/**
 * Planejamento anual do calendário de Opens (G-1/G-2) dos atletas.
 *
 * No INÍCIO de cada ano, cada atleta escolhe de uma vez os Opens que pretende
 * disputar no ano (em vez de decidir evento a evento). Isso corrige a prioridade
 * local (não trocar um G-2 em casa por um G-1 fora no mesmo mês), respeita a
 * FADIGA (nunca dois no mesmo dia; espaçamento e teto mensal) e leva em conta o
 * DECAIMENTO: quem vai perder muitos pontos no ano é mais agressivo para repô-los.
 *
 * No dia 2 de cada mês, um check reajusta o plano de quem perdeu um Open (lesão):
 * Agressivo/Escalador buscam um substituto; Elite/Local apenas ficam com um a
 * menos. Ver docs/ATHLETE_PROFILE.md.
 */

import { championPointsFor } from "../entities/competition.js";
import { effectivePoints } from "./ranking.js";
import { classifyEvent, isEligible } from "./eligibility.js";
import { continentOf } from "../config/continents.js";
import { combatRating } from "./combat/probability.js";
import { daysBetween } from "../utils/dates.js";
import { resolveHostRegion } from "./tournamentRegion.js";
import {
  profileForRank,
  openScore,
  isRegularOpen,
  seeksReplacement,
  openPointsThisYear,
  OPEN_POINTS_CAP,
  PROFILE_SEASON,
  DECAY_AGGRESSION_REF,
  FATIGUE,
} from "./athleteProfile.js";

const codeOf = (world, a) => world.countries[a.countryId]?.code || a.countryId;

function byRanking(a, b) {
  if ((b.ranking?.points ?? 0) !== (a.ranking?.points ?? 0)) {
    return (b.ranking?.points ?? 0) - (a.ranking?.points ?? 0);
  }
  return combatRating(b.attributes) - combatRating(a.attributes);
}

/** Opens comuns (G-1/G-2) de um ano. */
function regularOpensOfYear(world, year) {
  return Object.values(world.competitions).filter(
    (c) => c.date.slice(0, 4) === year && isRegularOpen(c, classifyEvent(c))
  );
}

/** True se o atleta disputou aquela competição (consta no histórico dele). */
function competedIn(athlete, competition) {
  return (athlete.history || []).some((h) => h.competitionId === competition.id);
}

/** Nº-alvo de Opens no ano: base do perfil + bônus pela pressão de decaimento. */
function targetOpens(world, athlete, year, profile) {
  const s = PROFILE_SEASON[profile];
  // Pontos que o atleta perde no ano por decaimento (só do ledger atual).
  const loss = Math.max(
    0,
    effectivePoints(athlete, `${year}-01-01`) - effectivePoints(athlete, `${year}-12-31`)
  );
  const bonus = Math.round(Math.min(1, loss / DECAY_AGGRESSION_REF) * (s.max - s.base));
  return s.base + bonus;
}

/** Candidatos de Open (elegíveis, Score>0) de um atleta, na ordem de escolha. */
function openCandidates(world, athlete, opens, profile) {
  const aCont = continentOf(codeOf(world, athlete));
  const aCode = codeOf(world, athlete);
  const out = [];
  for (const c of opens) {
    if (!isEligible(athlete, world, classifyEvent(c))) continue;
    const host = resolveHostRegion(world, c);
    const score = openScore(profile, championPointsFor(c.gRank), aCont, host?.continent, athlete.nationalTeam);
    if (score <= 0) continue;
    out.push({ c, date: c.date, score, isHome: !!host && host.code === aCode });
  }
  // Prioridade: CASA primeiro; depois maior Score; depois data mais cedo.
  out.sort((x, y) => y.isHome - x.isHome || y.score - x.score || (x.date < y.date ? -1 : 1));
  return out;
}

/** Escolhe Opens respeitando a fadiga (espaçamento e teto mensal). */
function pickWithFatigue(candidates, target, alreadyDates = []) {
  const picked = [];
  const takenDates = [...alreadyDates];
  const perMonth = {};
  for (const d of alreadyDates) perMonth[d.slice(0, 7)] = (perMonth[d.slice(0, 7)] || 0) + 1;
  for (const cand of candidates) {
    if (picked.length >= target) break;
    if (takenDates.some((d) => Math.abs(daysBetween(d, cand.date)) < FATIGUE.minRestDays)) continue;
    const m = cand.date.slice(0, 7);
    if ((perMonth[m] || 0) >= FATIGUE.maxPerMonth) continue;
    picked.push(cand);
    takenDates.push(cand.date);
    perMonth[m] = (perMonth[m] || 0) + 1;
  }
  return picked;
}

/** Planeja os Opens do ano para TODOS os atletas ativos. Idempotente por ano. */
export function planOpenSeason(world, year) {
  if (world.openPlanSeason === year) return; // já planejado neste ano
  const opens = regularOpensOfYear(world, year);
  for (const a of Object.values(world.athletes)) {
    if (a.status === "aposentado") continue;
    const profile = profileForRank(a.ranking?.position);
    const target = targetOpens(world, a, year, profile);
    const picked = target > 0 ? pickWithFatigue(openCandidates(world, a, opens, profile), target) : [];
    a.openPlan = { season: year, ids: picked.map((p) => p.c.id) };
  }
  world.openPlanSeason = year;
}

/**
 * Dia 2 de cada mês: reajusta o plano de quem perdeu um Open já disputado (lesão
 * ou por não ter entrado no campo). Agressivo/Escalador buscam substitutos.
 */
export function adjustPlansForInjuries(world, date) {
  const year = date.slice(0, 4);
  const opens = regularOpensOfYear(world, year);
  for (const a of Object.values(world.athletes)) {
    if (a.status === "aposentado") continue;
    const plan = a.openPlan;
    if (!plan || plan.season !== year || !plan.ids.length) continue;
    const missed = plan.ids.filter((id) => {
      const c = world.competitions[id];
      return c && c.status === "concluida" && c.date < date && !competedIn(a, c);
    });
    if (!missed.length) continue;
    const missedSet = new Set(missed);
    plan.ids = plan.ids.filter((id) => !missedSet.has(id)); // solta as vagas perdidas

    const profile = profileForRank(a.ranking?.position);
    if (!seeksReplacement(profile)) continue; // Elite/Local: fica com um a menos

    // Busca substitutos FUTUROS, respeitando a fadiga do plano restante.
    const inPlan = new Set(plan.ids);
    const plannedDates = plan.ids.map((id) => world.competitions[id]?.date).filter(Boolean);
    const future = openCandidates(world, a, opens, profile).filter(
      (cand) => cand.date > date && !inPlan.has(cand.c.id)
    );
    for (const cand of pickWithFatigue(future, missed.length, plannedDates)) {
      plan.ids.push(cand.c.id);
      plannedDates.push(cand.date);
    }
  }
}

// ---- Seleção do campo de um Open (dirigida pelo plano) -----------------------

/**
 * Compõe o campo de um Open com prioridade nacional/continental:
 *  - G-1: nacionalidade do torneio primeiro, depois os demais;
 *  - G-2: reserva 50% para a nacionalidade e ≥15% para o continente; o restante
 *    é aberto e as cotas não usadas passam aos demais.
 */
function composeOpenField(world, competition, host, athletes, fieldSize) {
  const N = fieldSize > 0 ? Math.min(fieldSize, athletes.length) : athletes.length;
  const pool = [...athletes].sort(byRanking);
  const code = (a) => codeOf(world, a);
  const isHost = (a) => host && code(a) === host.code;
  const isCont = (a) => host && !isHost(a) && continentOf(code(a)) === host.continent;

  if (competition.gRank === "G-1") {
    const nationals = pool.filter(isHost);
    const others = pool.filter((a) => !isHost(a));
    return [...nationals, ...others].slice(0, N);
  }
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
  take(pool, N);
  return field.slice(0, N);
}

/**
 * Campo de um Open: atletas que PLANEJARAM disputá-lo (ativos e sob o teto de
 * 40), com um campo mínimo garantido (completa por Score) e prioridade nacional/
 * continental. O bloqueio de mesmo-dia é aplicado pelo Simulation Director.
 */
export function plannedOpenField(world, competition, eligible, fieldSize, minField) {
  const year = competition.date.slice(0, 4);
  const host = resolveHostRegion(world, competition);
  const planned = eligible.filter(
    (a) =>
      a.openPlan?.season === year &&
      a.openPlan.ids.includes(competition.id) &&
      openPointsThisYear(a, year) < OPEN_POINTS_CAP
  );

  let field = planned;
  if (field.length < minField) {
    const pts = championPointsFor(competition.gRank);
    const inField = new Set(field.map((a) => a.id));
    const extra = eligible
      .filter((a) => !inField.has(a.id) && openPointsThisYear(a, year) < OPEN_POINTS_CAP)
      .map((a) => ({
        a,
        score: openScore(profileForRank(a.ranking?.position), pts, continentOf(codeOf(world, a)), host?.continent, a.nationalTeam),
      }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);
    field = [...field];
    for (const { a } of extra) {
      if (field.length >= minField) break;
      field.push(a);
    }
  }
  return composeOpenField(world, competition, host, field, fieldSize);
}
