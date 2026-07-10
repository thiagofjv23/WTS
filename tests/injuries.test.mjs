/**
 * Testes do Passo 14 — Injury System e Recovery System (#5).
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import { EventBus } from "../src/services/eventBus.js";
import { applyCompetitionInjuries, updateWear } from "../src/engine/injuries.js";
import { processRecovery } from "../src/engine/recovery.js";
import { createAthlete, ATHLETE_STATUS } from "../src/entities/athlete.js";
import { createCompetition } from "../src/entities/competition.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { buildSeasonCalendar } from "../src/engine/season.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { athletesInCategory } from "../src/core/world.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const MEN = MEN_CATEGORIES.map((c) => c.id);

function mkAthlete(id, wear = 0) {
  const attrs = {};
  for (const k of ALL_ATTRIBUTES) attrs[k] = 60;
  const a = createAthlete({
    id, forename: id, surname: "x", countryId: "C", gender: "M",
    birthDate: "2000-01-01", weightCategoryId: "WC-M-58", attributes: attrs,
  });
  a.condition.wear = wear;
  return a;
}

suite("Injury System");

test("updateWear recupera desgaste com o tempo", () => {
  const a = mkAthlete("A", 100);
  a.condition.wearUpdated = "2027-01-01";
  updateWear(a, "2027-01-31"); // 30 dias
  assert(a.condition.wear < 100 && a.condition.wear >= 0, `wear=${a.condition.wear}`);
  assertEqual(a.condition.wearUpdated, "2027-01-31");
});

test("lesões ocorrem sob alta carga/desgaste e afastam o atleta", () => {
  const world = { athletes: {}, injuries: [] };
  const matches = [];
  for (let i = 0; i < 60; i++) {
    const a = mkAthlete(`A${i}`, 200); // desgaste alto
    a.condition.wearUpdated = "2027-06-01";
    world.athletes[a.id] = a;
    // 6 lutas cada (carga alta)
    for (let r = 0; r < 6; r++) matches.push({ athleteAId: a.id, athleteBId: "opp", round: 2 });
  }
  const comp = createCompetition({ id: "C", name: "T", gRank: "G-2", date: "2027-06-01", categoryIds: MEN });
  const random = new RandomSystem(7);
  const injuries = applyCompetitionInjuries(world, comp, matches, random, "2027-06-01");
  assert(injuries.length > 0, "deveria haver lesões sob carga alta");
  for (const inj of injuries) {
    const a = world.athletes[inj.athleteId];
    assertEqual(a.status, ATHLETE_STATUS.INJURED);
    assert(a.condition.injuredUntil > "2027-06-01", "injuredUntil deveria ser futuro");
    assert(inj.weeks >= 2, "afastamento em semanas");
  }
  assertEqual(world.injuries.length, injuries.length);
});

test("é determinístico com a mesma seed", () => {
  function run() {
    const world = { athletes: {}, injuries: [] };
    const matches = [];
    for (let i = 0; i < 30; i++) {
      const a = mkAthlete(`A${i}`, 150); a.condition.wearUpdated = "2027-06-01";
      world.athletes[a.id] = a;
      for (let r = 0; r < 5; r++) matches.push({ athleteAId: a.id, athleteBId: "z" });
    }
    const comp = createCompetition({ id: "C", name: "T", gRank: "G-2", date: "2027-06-01", categoryIds: MEN });
    return applyCompetitionInjuries(world, comp, matches, new RandomSystem(3), "2027-06-01").map((i) => i.athleteId);
  }
  assertEqual(run(), run());
});

suite("Recovery System");

test("reativa atletas que cumpriram o afastamento", () => {
  const world = {
    athletes: { A1: mkAthlete("A1"), A2: mkAthlete("A2") },
    injuries: [
      { athleteId: "A1", until: "2027-06-10", severity: "leve" },
      { athleteId: "A2", until: "2027-08-01", severity: "grave" },
    ],
  };
  world.athletes.A1.status = ATHLETE_STATUS.INJURED;
  world.athletes.A2.status = ATHLETE_STATUS.INJURED;
  const recovered = processRecovery(world, "2027-06-15");
  assertEqual(recovered.map((r) => r.athleteId), ["A1"]);
  assertEqual(world.athletes.A1.status, ATHLETE_STATUS.ACTIVE);
  assertEqual(world.athletes.A2.status, ATHLETE_STATUS.INJURED);
  assertEqual(world.injuries.length, 1, "A2 continua na lista");
});

suite("Integração: lesões numa temporada");

test("atletas lesionados são excluídos dos campos e depois voltam", () => {
  const { world, random, idGen } = buildRealWorld({ seed: 20260101 });
  const bus = new EventBus();
  let injured = 0, recovered = 0;
  bus.on("AthleteInjured", () => injured++);
  bus.on("AthleteRecovered", () => recovered++);
  const dir = new SimulationDirector({ world, random, idGen, eventBus: bus });
  const comps = buildSeasonCalendar(world, idGen, { yearOffset: 0, categoryFilter: MEN });
  dir.advanceUntil(comps[comps.length - 1].date);

  assert(injured > 0, "deveria haver lesões na temporada");
  assert(recovered > 0, "deveria haver recuperações");
  // Nenhum campo inclui atleta lesionado: athletesInCategory só traz ativos.
  const active = athletesInCategory(world, "WC-M-58");
  assert(active.every((a) => a.status === ATHLETE_STATUS.ACTIVE), "campo só com ativos");
});
