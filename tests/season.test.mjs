/**
 * Testes do Passo 9 — Eventos reais e temporada completa.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { REAL_EVENTS } from "../src/database/realRoster.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { buildSeasonCalendar } from "../src/engine/season.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { EventBus } from "../src/services/eventBus.js";
import { G_RANKS } from "../src/entities/competition.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

suite("Eventos reais (dados)");

test("REAL_EVENTS tem eventos com G-Rank válido", () => {
  assert(REAL_EVENTS.length >= 20, `poucos eventos: ${REAL_EVENTS.length}`);
  for (const ev of REAL_EVENTS) {
    assert(ev.name, "evento sem nome");
    assert(G_RANKS[ev.gRank], `G-Rank inválido: ${ev.gRank}`);
    assert(Array.isArray(ev.categoryIds) && ev.categoryIds.length > 0, "sem categorias");
  }
});

test("G-Rank inferido corretamente (Europeu=G-4, Turkiye=G-1)", () => {
  const euro = REAL_EVENTS.find((e) => /European Senior/i.test(e.name));
  const turkiye = REAL_EVENTS.find((e) => /Turkiye/i.test(e.name));
  assert(euro && euro.gRank === "G-4", "Europeu deveria ser G-4");
  assert(turkiye && turkiye.gRank === "G-1", "Turkiye Open deveria ser G-1");
});

suite("Calendário da temporada");

test("agenda uma competição por evento, em datas crescentes", () => {
  const { world, idGen } = buildRealWorld({ seed: 1 });
  const comps = buildSeasonCalendar(world, idGen, { categoryFilter: MEN_IDS });
  assertEqual(comps.length, REAL_EVENTS.length);
  for (let i = 1; i < comps.length; i++) {
    assert(comps[i].date >= comps[i - 1].date, "datas deveriam ser crescentes");
  }
  assertEqual(world.calendar.length, REAL_EVENTS.length);
});

suite("Temporada completa");

test("simula a temporada inteira e evolui o ranking", () => {
  const { world, random, idGen } = buildRealWorld({ seed: 20260701 });
  const comps = buildSeasonCalendar(world, idGen, { categoryFilter: MEN_IDS });
  const lastDate = comps[comps.length - 1].date;

  // Snapshot dos pontos antes.
  const before = {};
  for (const a of Object.values(world.athletes)) before[a.id] = a.ranking.points;

  const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });
  director.advanceUntil(lastDate);

  // Todas as competições foram concluídas.
  for (const c of comps) assertEqual(c.status, "concluida", `${c.name} não concluída`);

  // Pontos mudaram para pelo menos parte dos atletas (ranking evoluiu).
  let changed = 0;
  for (const a of Object.values(world.athletes)) {
    if (a.ranking.points !== before[a.id]) changed++;
  }
  assert(changed > 100, `poucos atletas mudaram de pontos: ${changed}`);

  // Estatísticas coerentes: total de ouros = nº de (evento × categoria).
  const totalGolds = Object.values(world.athletes).reduce((s, a) => s + a.statistics.golds, 0);
  const expectedGolds = comps.reduce((s, c) => s + c.categoryIds.length, 0);
  assertEqual(totalGolds, expectedGolds);

  // Histórico acumulou um registro por (evento × categoria).
  assertEqual(world.history.length, expectedGolds);
});

test("temporada é determinística com a mesma seed", () => {
  function run() {
    const { world, random, idGen } = buildRealWorld({ seed: 555 });
    const comps = buildSeasonCalendar(world, idGen, { categoryFilter: MEN_IDS });
    const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });
    director.advanceUntil(comps[comps.length - 1].date);
    // Retorna o ranking final da -58 kg.
    return world.rankings["WC-M-58"].athleteIds
      .slice(0, 10)
      .map((id) => world.athletes[id].fullName);
  }
  assertEqual(run(), run(), "top-10 final deveria ser idêntico");
});
