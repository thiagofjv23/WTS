/**
 * Campeonato Mundial (bienal, G-14, 1 por país).
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { createCompetition, championPointsFor } from "../src/entities/competition.js";
import { classifyEvent } from "../src/engine/eligibility.js";
import { isWorldsYear, isWorldChampionship, WORLDS_GRANK } from "../src/engine/worldChampionship.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const MEN = MEN_CATEGORIES.map((c) => c.id);

suite("Mundial — calendário e travas");

test("bienal em anos ímpares a partir de 2027", () => {
  assert(isWorldsYear(2027), "2027 tem Mundial");
  assert(!isWorldsYear(2026), "2026 não");
  assert(!isWorldsYear(2028), "2028 não");
  assert(isWorldsYear(2029), "2029 tem");
  assert(isWorldsYear(2031), "2031 tem");
});

test("G-14: 1 por país, sem continente/lock, campeão 140", () => {
  const w = createCompetition({ id: "W", name: "Campeonato Mundial de Taekwondo 2027", gRank: WORLDS_GRANK, date: "2027-07-18", categoryIds: MEN });
  assert(isWorldChampionship(w));
  const rules = classifyEvent(w);
  assertEqual(rules.nationalLimit, 1, "1 por país");
  assertEqual(rules.continent, null, "mundial (sem continente)");
  assertEqual(rules.rankingLockTopN, null, "sem lock de ranking");
  assertEqual(championPointsFor(WORLDS_GRANK), 140);
});

suite("Mundial — integração");

test("2026 não tem Mundial; 2027 tem, 1/país, campeão pontua 140", () => {
  const g = new GameController({ storage: new StorageService(new MemoryBackend()) });
  g.newGame(20260101);
  g.advanceOneYear(); // 2026
  assert(!Object.values(g.world.competitions).some((c) => isWorldChampionship(c) && c.date.startsWith("2026")), "2026 sem Mundial");
  g.advanceOneYear(); // 2027

  const w = Object.values(g.world.competitions).find((c) => isWorldChampionship(c) && c.date.startsWith("2027"));
  assert(w && w.status === "concluida", "Mundial 2027 deveria ter rodado");
  assert(w.date.startsWith("2027-07"), "em julho");
  const view = g.getCompetitionView(w.id);
  assertEqual(view.championPoints, 140);
  for (const cat of view.categories) {
    const countries = new Set(cat.placements.map((p) => p.ioc));
    assertEqual(countries.size, cat.placements.length, "1 atleta por país (países distintos)");
    assertEqual(cat.placements.filter((p) => p.placement === 1).length, 1, "um campeão");
  }
  const champId = view.categories[0].placements.find((p) => p.placement === 1).athleteId;
  const entry = g.world.athletes[champId].pointsLedger.find((e) => e.competitionId === w.id);
  assert(entry && entry.points === 140, "campeão +140 no ledger");
});
