/**
 * Testes do Passo 11 — Regra best-N e modelo de participação.
 */

import { suite, test, assert, assertEqual, assertClose } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import { EventBus } from "../src/services/eventBus.js";
import {
  enterProbability,
  recentLoad,
  selectParticipants,
} from "../src/engine/participation.js";
import { effectivePoints, BEST_N } from "../src/engine/ranking.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { buildSeasonCalendar } from "../src/engine/season.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { createCompetition } from "../src/entities/competition.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

function fakeAthlete(pos, historyDates = []) {
  return {
    id: `A${pos}`,
    ranking: { position: pos, points: 1000 - pos },
    attributes: { ataque: 60, defesa: 60 },
    history: historyDates.map((date) => ({ date })),
  };
}

function comp(gRank, date = "2027-06-01") {
  return createCompetition({
    id: "C1", name: "T", gRank, date, categoryIds: MEN_IDS,
  });
}

suite("Best-N (melhores resultados)");

test("effectivePoints soma apenas os BEST_N maiores", () => {
  const athlete = {
    pointsLedger: Array.from({ length: 10 }, (_, i) => ({
      date: "2027-01-01", points: (i + 1) * 5, gRank: "G-1",
    })),
  };
  // sem decaimento (mesma data): top5 = 50+45+40+35+30 = 200
  assertEqual(effectivePoints(athlete, "2027-01-01"), 200);
  assertEqual(BEST_N, 5);
});

test("resultados fracos além do N não contam", () => {
  const athlete = {
    pointsLedger: [
      { date: "2027-01-01", points: 100 },
      { date: "2027-01-01", points: 1 },
      { date: "2027-01-01", points: 1 },
    ],
  };
  assertEqual(effectivePoints(athlete, "2027-01-01"), 102);
});

suite("Participação — probabilidade");

test("atleta do topo evita G-1 e prioriza G-10", () => {
  const top = fakeAthlete(1);
  const pG1 = enterProbability(top, comp("G-1"), 256);
  const pG10 = enterProbability(top, comp("G-10"), 256);
  assert(pG10 > pG1 * 3, `topo deveria priorizar G-10 (${pG10}) sobre G-1 (${pG1})`);
});

test("atleta de base entra em G-1 mais que o do topo", () => {
  const top = fakeAthlete(1);
  const base = fakeAthlete(240);
  const pTop = enterProbability(top, comp("G-1"), 256);
  const pBase = enterProbability(base, comp("G-1"), 256);
  assert(pBase > pTop, `base (${pBase}) deveria superar topo (${pTop}) em G-1`);
});

test("fadiga reduz a probabilidade", () => {
  const rested = fakeAthlete(50, []);
  const tired = fakeAthlete(50, ["2027-05-20", "2027-05-25", "2027-05-28"]);
  const pR = enterProbability(rested, comp("G-2", "2027-06-01"), 256);
  const pT = enterProbability(tired, comp("G-2", "2027-06-01"), 256);
  assert(pT < pR, "atleta fatigado deveria ter menor probabilidade");
});

test("recentLoad conta competições na janela", () => {
  // history é cronológico (mais antigo → mais recente)
  const a = fakeAthlete(1, ["2027-03-01", "2027-05-01", "2027-05-20"]);
  assertEqual(recentLoad(a, "2027-05-28"), 2); // 05-01 e 05-20 dentro de 35 dias
});

suite("Participação — seleção de campo");

test("respeita fieldSize e mínimo de campo", () => {
  const { world, random } = buildRealWorld({ seed: 1 });
  const c = comp("G-1");
  const field = selectParticipants(world, c, "WC-M-58", random, { fieldSize: 32 });
  assert(field.length <= 32, "não deveria exceder fieldSize");
  assert(field.length >= 8, "deveria garantir campo mínimo");
});

suite("Participação — efeito no ecossistema");

test("G-1 é vencido por não-elite; grandes eventos pela elite", () => {
  const { world, random, idGen } = buildRealWorld({ seed: 20260701 });
  const dir = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });
  const comps = buildSeasonCalendar(world, idGen, { yearOffset: 1, categoryFilter: MEN_IDS });
  dir.advanceUntil(comps[comps.length - 1].date);

  const g1Ranks = [], bigRanks = [];
  for (const h of world.history) {
    const c = world.competitions[h.competitionId];
    const champ = world.athletes[h.champion];
    if (!champ) continue;
    const rank = champ.realRank || 999;
    if (c.gRank === "G-1") g1Ranks.push(rank);
    if (c.gRank === "G-6" || c.gRank === "G-10") bigRanks.push(rank);
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert(g1Ranks.length > 0 && bigRanks.length > 0, "deveria haver campeões");
  // Campeões de G-1 têm ranking real pior (número maior) que os dos grandes.
  assert(mean(g1Ranks) > mean(bigRanks) * 1.5,
    `G-1 (${mean(g1Ranks).toFixed(0)}) deveria ser vencido por atletas de ranking pior que os grandes (${mean(bigRanks).toFixed(0)})`);
});

test("pontos de topo ficam realistas após 3 temporadas (best-N + participação)", () => {
  const { world, random, idGen } = buildRealWorld({ seed: 42 });
  const dir = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });
  for (let s = 1; s <= 3; s++) {
    const comps = buildSeasonCalendar(world, idGen, { yearOffset: s, categoryFilter: MEN_IDS });
    dir.advanceUntil(comps[comps.length - 1].date);
  }
  for (const cat of MEN_CATEGORIES) {
    const leader = world.athletes[world.rankings[cat.id].athleteIds[0]];
    assert(leader.ranking.points < 500,
      `${cat.id}: líder com ${leader.ranking.points} pts (inflado; best-N deveria limitar)`);
    assert(leader.ranking.points > 80, `${cat.id}: líder com poucos pontos`);
  }
});
