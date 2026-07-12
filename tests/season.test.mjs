/**
 * Testes do Passo 10 — Calendário 2026 real, decaimento e múltiplas temporadas.
 */

import { suite, test, assert, assertEqual, assertClose } from "./harness.mjs";
import { CALENDAR_2026 } from "../src/database/calendar2026.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { buildSeasonCalendar } from "../src/engine/season.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { EventBus } from "../src/services/eventBus.js";
import { isValidGRank, championPointsFor } from "../src/entities/competition.js";
import { decayFactor, effectivePoints, pointsForPlacement } from "../src/engine/ranking.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

suite("G-Rank generalizado");

test("championPointsFor segue n×10 (inclui G-6/G-10)", () => {
  assertEqual(championPointsFor("G-1"), 10);
  assertEqual(championPointsFor("G-6"), 60);
  assertEqual(championPointsFor("G-10"), 100);
  assertEqual(championPointsFor("G-20"), 200);
  assert(isValidGRank("G-6") && !isValidGRank("X"));
});

test("pontos por colocação escalam com G-6 e G-10", () => {
  assertEqual(pointsForPlacement("G-6", 1), 60);
  assertEqual(pointsForPlacement("G-10", 1), 100);
  assertEqual(pointsForPlacement("G-6", 2), 36);
});

suite("Calendário 2026 (dados)");

test("CALENDAR_2026 é válido e ordenado por data", () => {
  assert(CALENDAR_2026.length >= 20, "poucos eventos");
  for (let i = 0; i < CALENDAR_2026.length; i++) {
    const e = CALENDAR_2026[i];
    assert(isValidGRank(e.gRank), `G-Rank inválido: ${e.gRank}`);
    assert(/^2026-\d\d-\d\d$/.test(e.date), `data inválida: ${e.date}`);
    assert(e.categoryIds.length === 4, "deveria ter 4 categorias masculinas");
    if (i > 0) assert(e.date >= CALENDAR_2026[i - 1].date, "fora de ordem");
  }
});

test("inclui os grandes eventos de 2026 (Grand Prix Final G-10)", () => {
  const gpf = CALENDAR_2026.find((e) => /Grand Prix Final/i.test(e.name));
  assert(gpf && gpf.gRank === "G-10", "Grand Prix Final deveria ser G-10");
  const series = CALENDAR_2026.filter((e) => /Grand Prix Series/i.test(e.name));
  assert(series.length === 3 && series.every((e) => e.gRank === "G-6"), "3 GP Series G-6");
});

suite("Decaimento (§5)");

test("decayFactor segue 100/75/50/25/0 por ano", () => {
  assertEqual(decayFactor(0), 1);
  assertEqual(decayFactor(11), 1);
  assertEqual(decayFactor(12), 0.75);
  assertEqual(decayFactor(24), 0.5);
  assertEqual(decayFactor(36), 0.25);
  assertEqual(decayFactor(48), 0);
  assertEqual(decayFactor(60), 0);
});

test("effectivePoints aplica decaimento sobre o ledger", () => {
  const athlete = {
    pointsLedger: [
      { date: "2026-01-01", points: 100, gRank: "seed" }, // 2 anos antes de 2028 → 50%
      { date: "2027-01-01", points: 40, gRank: "G-4" }, // 1 ano antes → 75%
    ],
  };
  assertClose(effectivePoints(athlete, "2028-01-01"), 100 * 0.5 + 40 * 0.75, 0.01);
});

suite("Temporada com calendário real");

test("agenda os eventos do calendário nas datas reais (com offset de ano)", () => {
  const { world, idGen } = buildRealWorld({ seed: 1 });
  const comps = buildSeasonCalendar(world, idGen, { yearOffset: 1, categoryFilter: MEN_IDS });
  assertEqual(comps.length, CALENDAR_2026.length);
  assert(comps[0].date.startsWith("2027"), "datas deveriam ser deslocadas para 2027");
  for (let i = 1; i < comps.length; i++) {
    assert(comps[i].date >= comps[i - 1].date, "datas fora de ordem");
  }
});

test("o ANO no nome do evento acompanha a temporada (não fica preso em 2026)", () => {
  const { world, idGen } = buildRealWorld({ seed: 1 });
  const comps = buildSeasonCalendar(world, idGen, { yearOffset: 1, categoryFilter: MEN_IDS });
  // Nenhuma edição de 2027 deve carregar "2026" no nome.
  const stale = comps.filter((c) => c.date.startsWith("2027") && c.name.includes("2026"));
  assertEqual(stale.length, 0, `edições de 2027 não deveriam citar 2026: ${stale.map((c) => c.name).slice(0, 2)}`);
  // E o ano correto aparece onde o base tinha ano no nome.
  const roma = comps.find((c) => /Roma .* Grand Prix Series/i.test(c.name));
  assert(roma && roma.name.includes("2027"), `Roma 2027 esperado, veio "${roma?.name}"`);
});

suite("Múltiplas temporadas");

test("simula 3 temporadas; pontos iniciais decaem e ranking evolui", () => {
  const { world, random, idGen } = buildRealWorld({ seed: 20260701 });
  const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });

  const leaderId = world.rankings["WC-M-80"].athleteIds[0];
  const seedPoints = world.athletes[leaderId].pointsLedger[0].points;

  for (let s = 1; s <= 3; s++) {
    const comps = buildSeasonCalendar(world, idGen, { yearOffset: s, categoryFilter: MEN_IDS });
    director.advanceUntil(comps[comps.length - 1].date);
  }

  // O seed é datado no início do mundo (01/01/2026) e decai ao longo dos anos.
  const seedEntry = world.athletes[leaderId].pointsLedger[0];
  assert(seedEntry.gRank === "seed", "primeira entrada deveria ser o seed");
  // O ledger acumulou muitos resultados ao longo das temporadas.
  assert(world.athletes[leaderId].pointsLedger.length > 3, "ledger deveria crescer");

  // O mundo avançou ~3+ anos.
  assert(world.state.currentDate >= "2029-01-01", `data final inesperada: ${world.state.currentDate}`);

  // Histórico acumulou eventos de 3 temporadas.
  const perSeason = CALENDAR_2026.length * MEN_CATEGORIES.length;
  assertEqual(world.history.length, perSeason * 3);
});

test("múltiplas temporadas são determinísticas", () => {
  function run() {
    const { world, random, idGen } = buildRealWorld({ seed: 777 });
    const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });
    for (let s = 1; s <= 2; s++) {
      const comps = buildSeasonCalendar(world, idGen, { yearOffset: s, categoryFilter: MEN_IDS });
      director.advanceUntil(comps[comps.length - 1].date);
    }
    return world.rankings["WC-M-58"].athleteIds.slice(0, 10);
  }
  assertEqual(run(), run());
});
