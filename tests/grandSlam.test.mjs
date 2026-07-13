/**
 * Grand Slam Champions Series.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { createCompetition, championPointsFor } from "../src/entities/competition.js";
import { classifyEvent } from "../src/engine/eligibility.js";
import { isGrandSlam, scheduleGrandSlam, GRAND_SLAM_GRANK, GRAND_SLAM_FIELD } from "../src/engine/grandSlam.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const MEN = MEN_CATEGORIES.map((c) => c.id);

function newGame(seed = 20260101) {
  const g = new GameController({ storage: new StorageService(new MemoryBackend()) });
  g.newGame(seed);
  return g;
}

suite("Grand Slam — dados e travas");

test("é reconhecido pelo nome e é convite top 16", () => {
  const gs = createCompetition({
    id: "GS", name: "WT Grand Slam Champions Series 2027",
    gRank: GRAND_SLAM_GRANK, date: "2027-12-12", categoryIds: MEN,
  });
  assert(isGrandSlam(gs), "deveria ser detectado como Grand Slam");
  const rules = classifyEvent(gs);
  assertEqual(rules.rankingLockTopN, 16, "convite: top 16");
  assert(rules.invitational, "invitational (elegíveis comparecem)");
  assertEqual(championPointsFor(GRAND_SLAM_GRANK), 120, "campeão = 120 pts");
});

test("scheduleGrandSlam agenda 1 evento em dezembro, todas as categorias", () => {
  const { world, idGen } = buildRealWorld({ seed: 1 });
  const gs = scheduleGrandSlam(world, idGen, { year: 2026, categoryFilter: MEN });
  assert(gs.date.startsWith("2026-12"), `esperado dezembro, veio ${gs.date}`);
  assertEqual(gs.gRank, GRAND_SLAM_GRANK);
  assertEqual(gs.categoryIds.length, 4);
  assert(world.competitions[gs.id], "agendado no mundo");
});

suite("Grand Slam — integração");

test("roda como torneio: só o top 16 disputa, campeão pontua", () => {
  const g = newGame();
  g.advanceOneYear(); // roda 2026 (com o Grand Slam de dez)

  const gs = Object.values(g.world.competitions).find(
    (c) => isGrandSlam(c) && c.date.startsWith("2026")
  );
  assert(gs && gs.status === "concluida", "Grand Slam deveria ter sido disputado");
  const view = g.getCompetitionView(gs.id);
  assertEqual(view.championPoints, 120);
  assertEqual(view.eligibility.rankingLockTopN, 16);

  for (const cat of view.categories) {
    assert(cat.placements.length <= GRAND_SLAM_FIELD, "no máximo 16 por categoria");
    assertEqual(cat.placements.filter((p) => p.placement === 1).length, 1, "um campeão");
    // só top 16 no chaveamento (ranking de início <= 16 quando conhecido)
    const ranks = cat.matches.flatMap((m) => [m.a.rank, m.b.rank]).filter((x) => x != null);
    assert(ranks.every((r) => r <= 16), "só convidados top 16 no chaveamento");
  }

  // o campeão recebeu os 120 pts no ledger (evento oficial, pontua no ranking).
  const champId = view.categories[0].placements.find((p) => p.placement === 1).athleteId;
  const entry = g.world.athletes[champId].pointsLedger.find((e) => e.competitionId === gs.id);
  assert(entry && entry.points === 120, "campeão deveria ter +120 no ledger");
});
