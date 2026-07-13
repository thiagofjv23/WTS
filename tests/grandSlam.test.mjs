/**
 * Grand Slam — formato remodelado: Challenge (seletiva aberta G-2) + Finals
 * (10 válidos, Ranking de Mérito). A partir de 2027.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { createCompetition } from "../src/entities/competition.js";
import { classifyEvent } from "../src/engine/eligibility.js";
import {
  isGrandSlam,
  isGrandSlamChallenge,
  isGrandSlamFinals,
  scheduleGrandSlam,
  grandSlamChallengeQualifiers,
  meritPointsFor,
  meritDecayFactor,
  GRAND_SLAM_CHALLENGE_GRANK,
  GRAND_SLAM_FINALS_GRANK,
  GRAND_SLAM_FINALS_FIELD,
} from "../src/engine/grandSlam.js";
import { simulateCategory } from "../src/engine/competitionSystem.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";
import { RandomSystem } from "../src/services/random.js";

const MEN = MEN_CATEGORIES.map((c) => c.id);

function newGame(seed = 20260101) {
  const g = new GameController({ storage: new StorageService(new MemoryBackend()) });
  g.newGame(seed);
  return g;
}

suite("Grand Slam — dados, agenda e travas");

test("detecta Challenge e Finals pelo nome", () => {
  const ch = createCompetition({
    id: "CH", name: "WT Grand Slam Challenge 2027",
    gRank: GRAND_SLAM_CHALLENGE_GRANK, date: "2027-12-10", categoryIds: MEN,
  });
  const fi = createCompetition({
    id: "FI", name: "WT Grand Slam Finals 2027",
    gRank: GRAND_SLAM_FINALS_GRANK, date: "2027-12-12", categoryIds: MEN,
  });
  assert(isGrandSlam(ch) && isGrandSlam(fi), "ambos são Grand Slam");
  assert(isGrandSlamChallenge(ch) && !isGrandSlamChallenge(fi), "Challenge");
  assert(isGrandSlamFinals(fi) && !isGrandSlamFinals(ch), "Finals");
});

test("Challenge é aberto (G-2, sem trava); Finals por convite (sem lock)", () => {
  const ch = createCompetition({
    id: "CH", name: "WT Grand Slam Challenge 2027",
    gRank: GRAND_SLAM_CHALLENGE_GRANK, date: "2027-12-10", categoryIds: MEN,
  });
  const rch = classifyEvent(ch);
  assertEqual(rch.rankingLockTopN, null, "Challenge sem lock de ranking");
  assertEqual(rch.nationalLimit, null, "Challenge sem limite nacional");
  assert(!rch.invitational, "Challenge não é por convite (aberto)");

  const fi = createCompetition({
    id: "FI", name: "WT Grand Slam Finals 2027",
    gRank: GRAND_SLAM_FINALS_GRANK, date: "2027-12-12", categoryIds: MEN,
  });
  const rfi = classifyEvent(fi);
  assertEqual(rfi.rankingLockTopN, null, "Finals sem lock (campo resolvido)");
  assert(rfi.invitational, "Finals por convite (10 válidos)");
});

test("scheduleGrandSlam: nada antes de 2027; par Challenge+Finals em 2027", () => {
  const { world, idGen } = buildRealWorld({ seed: 1 });
  assertEqual(scheduleGrandSlam(world, idGen, { year: 2026, categoryFilter: MEN }), null, "2026 sem Grand Slam");

  const pair = scheduleGrandSlam(world, idGen, { year: 2027, categoryFilter: MEN });
  assert(pair && pair.challenge && pair.finals, "agenda o par em 2027");
  assert(pair.challenge.date === "2027-12-10", `Challenge 10/dez (veio ${pair.challenge.date})`);
  assert(pair.finals.date === "2027-12-12", `Finals 12/dez (veio ${pair.finals.date})`);
  assertEqual(pair.challenge.gRank, GRAND_SLAM_CHALLENGE_GRANK);
  assertEqual(pair.finals.gRank, GRAND_SLAM_FINALS_GRANK);
  assertEqual(pair.challenge.fieldSize, 0, "Challenge aberto (sem limite)");
});

suite("Grand Slam — mérito e qualificados");

test("pontos e decaimento do mérito (50%/ano, 2 anos)", () => {
  assertEqual(meritPointsFor(1), 1000);
  assertEqual(meritPointsFor(2), 600);
  assertEqual(meritPointsFor(3), 360);
  assertEqual(meritPointsFor(4), 216);
  assertEqual(meritPointsFor(5), 151);
  assertEqual(meritPointsFor(9), 106);
  assertEqual(meritPointsFor(7), 0, "colocação sem prêmio de mérito");

  assertEqual(meritDecayFactor(0), 1, "ano 0 = 100%");
  assertEqual(meritDecayFactor(12), 0.5, "ano 1 = 50%");
  assertEqual(meritDecayFactor(24), 0, "ano 2 = 0% (expira)");
});

test("qualificados do Challenge escorregam se os finalistas forem do mesmo país", () => {
  const world = {
    athletes: {
      A: { id: "A", countryId: "c1", ranking: { points: 0 }, attributes: {} },
      B: { id: "B", countryId: "c1", ranking: { points: 0 }, attributes: {} },
      C: { id: "C", countryId: "c2", ranking: { points: 0 }, attributes: {} },
      D: { id: "D", countryId: "c3", ranking: { points: 0 }, attributes: {} },
    },
    countries: { c1: { code: "KOR" }, c2: { code: "BRA" }, c3: { code: "USA" } },
  };
  const placements = [
    { athleteId: "A", placement: 1 },
    { athleteId: "B", placement: 2 },
    { athleteId: "C", placement: 3 },
    { athleteId: "D", placement: 4 },
  ];
  // A (KOR) campeão, B (KOR) vice mesmo país → 2ª vaga vai para C (BRA).
  assertEqual(grandSlamChallengeQualifiers(world, placements).join(","), "A,C");

  // Caso normal: vice de outro país fica com a vaga.
  world.athletes.B.countryId = "c2";
  assertEqual(grandSlamChallengeQualifiers(world, placements).join(","), "A,B");
});

suite("Grand Slam — disputa de 3º lugar (motor de chave)");

test("thirdPlaceMatch: um único bronze e um 4º distinto", () => {
  const random = new RandomSystem(1);
  const athletes = ["A", "B", "C", "D"].map((id) => ({ id }));
  // fightFn determinístico: o primeiro slot (a) sempre vence.
  const fightFn = (_r, a) => ({ winnerId: a.id, rounds: [] });
  const { placements, matches } = simulateCategory(random, athletes, {
    preseeded: true,
    thirdPlaceMatch: true,
    fightFn,
  });
  const byPlace = new Map(placements.map((p) => [p.placement, p]));
  assertEqual(placements.filter((p) => p.placement === 3).length, 1, "um único bronze");
  assertEqual(placements.filter((p) => p.placement === 4).length, 1, "um 4º distinto");
  assertEqual(byPlace.get(3).medal, "bronze");
  assertEqual(byPlace.get(4).medal, null, "4º sem medalha");
  assert(matches.some((m) => m.round === 3), "houve disputa de bronze (round sentinela 3)");
});

suite("Grand Slam — integração (2027)");

test("Challenge roda como G-2 aberto com bronze único; pontua no ranking", () => {
  const g = newGame();
  g.advanceOneYear(); // 2026 (sem Grand Slam)
  g.advanceOneYear(); // 2027

  const ch = Object.values(g.world.competitions).find(
    (c) => isGrandSlamChallenge(c) && c.date.startsWith("2027")
  );
  assert(ch && ch.status === "concluida", "Challenge 2027 deveria ter rodado");
  const view = g.getCompetitionView(ch.id);
  assertEqual(view.championPoints, 20, "G-2: campeão 20 pts");
  for (const cat of view.categories) {
    assertEqual(cat.placements.filter((p) => p.placement === 3).length, 1, "bronze único");
    assert(cat.placements.length > GRAND_SLAM_FINALS_FIELD, "campo aberto (bem mais que 10)");
  }
  // Campeão pontuou no ranking normal (evento oficial G-2).
  const champId = view.categories[0].placements.find((p) => p.placement === 1).athleteId;
  const entry = g.world.athletes[champId].pointsLedger.find((e) => e.competitionId === ch.id);
  assert(entry && entry.points === 20, "campeão +20 no ledger");
});

test("Finals: 10 válidos, mérito separado, sem pontos no ranking, byes aos cabeças", () => {
  const g = newGame();
  g.advanceOneYear(); // 2026
  g.advanceOneYear(); // 2027

  const fi = Object.values(g.world.competitions).find(
    (c) => isGrandSlamFinals(c) && c.date.startsWith("2027")
  );
  assert(fi && fi.status === "concluida", "Finals 2027 deveria ter rodado");
  assert(fi.date === "2027-12-12", "12/dez");
  const view = g.getCompetitionView(fi.id);
  assert(view.grandSlamFinals, "marcada como Finals do Grand Slam");
  assertEqual(view.championPoints, 1000, "campeão vale 1000 de mérito");

  for (const cat of view.categories) {
    assertEqual(cat.placements.length, GRAND_SLAM_FINALS_FIELD, "10 válidos por peso");
    assertEqual(cat.placements.filter((p) => p.placement === 1).length, 1, "um campeão");
    assertEqual(cat.placements.filter((p) => p.placement === 3).length, 1, "bronze único");
    assertEqual(cat.placements.filter((p) => p.placement === 4).length, 1, "4º distinto");
    // Ranking de Mérito exibido na tela; campeão com 1000.
    assert(cat.meritRanking && cat.meritRanking.length >= 1, "ranking de mérito presente");
    assertEqual(cat.meritRanking[0].points, 1000, "líder do mérito com 1000");
    // Chave de 16 com 6 byes: a 1ª rodada (round 16) tem só 2 lutas.
    const r16 = cat.matches.filter((m) => m.round === 16);
    assertEqual(r16.length, 2, "6 byes → 2 lutas na 1ª rodada");
    const champ = cat.placements.find((p) => p.placement === 1);
    assertEqual(champ.points, 1000, "campeão com 1000 de mérito na classificação");
  }

  // Finais NÃO creditam pontos no ranking normal (sem entrada no ledger).
  const champId = view.categories[0].placements.find((p) => p.placement === 1).athleteId;
  const ledgerEntry = (g.world.athletes[champId].pointsLedger || []).find(
    (e) => e.competitionId === fi.id
  );
  assert(!ledgerEntry, "Finals não gera entrada no ledger de ranking");
  // Mas alimentam o ledger de mérito separado.
  assert(
    (g.world.grandSlamMerit || []).some((e) => e.competitionId === fi.id),
    "Finals alimentam o ledger de mérito"
  );
});
