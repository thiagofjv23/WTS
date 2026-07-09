/**
 * Testes do Passo 7 — Ranking System e pipeline completo (Simulation Director).
 * Roda um campeonato inteiro ponta a ponta.
 */

import { suite, test, assert, assertEqual, assertClose } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import { EventBus } from "../src/services/eventBus.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import {
  pointsForPlacement,
  placementTier,
  recomputeRankings,
} from "../src/engine/ranking.js";
import { buildSeedWorld } from "../src/database/seed.js";
import { createCompetition } from "../src/entities/competition.js";
import { scheduleCompetition } from "../src/engine/calendar.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

suite("Ranking — pontos por colocação");

test("placementTier mapeia colocações da eliminação", () => {
  assertEqual(placementTier(1), 0);
  assertEqual(placementTier(2), 1);
  assertEqual(placementTier(3), 2);
  assertEqual(placementTier(5), 3);
  assertEqual(placementTier(9), 4);
});

test("pontos G-1 batem com a tabela oficial (§2)", () => {
  assertEqual(pointsForPlacement("G-1", 1), 10);
  assertEqual(pointsForPlacement("G-1", 2), 6);
  assertEqual(pointsForPlacement("G-1", 3), 3.6);
  assertEqual(pointsForPlacement("G-1", 5), 2.16);
  assertEqual(pointsForPlacement("G-1", 9), 1.51);
});

test("pontos escalam com o G-Rank", () => {
  assertEqual(pointsForPlacement("G-20", 1), 200);
  assertEqual(pointsForPlacement("G-8", 1), 80);
  assertClose(pointsForPlacement("G-20", 2), 120, 0.01);
});

suite("Pipeline completo (Simulation Director)");

/** Agenda um Aberto G-1 com as 4 categorias masculinas na data inicial. */
function scheduleOpen(world, idGen, date) {
  const comp = createCompetition({
    id: idGen.next("COMP"),
    name: "Aberto Mundial de Teste",
    gRank: "G-1",
    date,
    categoryIds: MEN_CATEGORIES.map((c) => c.id),
  });
  scheduleCompetition(world, idGen, comp);
  return comp;
}

test("um dia com um campeonato apura campeões e distribui pontos", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 20280101 });
  const date = world.state.currentDate;
  const comp = scheduleOpen(world, idGen, date);
  const bus = new EventBus();
  const director = new SimulationDirector({ world, random, idGen, eventBus: bus });

  director.advanceDay();

  // Competição concluída.
  assertEqual(world.competitions[comp.id].status, "concluida");
  // Cada categoria tem um campeão registrado nos resultados.
  for (const cat of MEN_CATEGORIES) {
    const placements = comp.results[cat.id];
    assert(placements, `sem resultados em ${cat.id}`);
    const champs = placements.filter((p) => p.placement === 1);
    assertEqual(champs.length, 1, `deveria haver 1 campeão em ${cat.id}`);
    assertEqual(champs[0].rankingPointsEarned, 10, "campeão G-1 = 10 pontos");
  }
  // A data avançou um dia.
  assert(world.state.currentDate > date, "data deveria avançar");
  assertEqual(world.state.processedDays, 1);
});

test("ranking, estatísticas e histórico são atualizados", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 42 });
  const date = world.state.currentDate;
  scheduleOpen(world, idGen, date);
  const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });
  director.advanceDay();

  // Todo atleta ativo tem posição de ranking definida.
  for (const cat of MEN_CATEGORIES) {
    const ranking = world.rankings[cat.id];
    assert(ranking && ranking.athleteIds.length > 0, `sem ranking em ${cat.id}`);
    const top = world.athletes[ranking.athleteIds[0]];
    assertEqual(top.ranking.position, 1);
    // O nº 1 deveria ter pelo menos tantos pontos quanto o nº 2.
    const second = world.athletes[ranking.athleteIds[1]];
    assert(top.ranking.points >= second.ranking.points, "ranking mal ordenado");
  }

  // Estatísticas: soma de ouros = nº de categorias (1 campeão cada).
  const totalGolds = Object.values(world.athletes).reduce((s, a) => s + a.statistics.golds, 0);
  assertEqual(totalGolds, MEN_CATEGORIES.length);

  // Histórico permanente gravado por categoria.
  assertEqual(world.history.length, MEN_CATEGORIES.length);
  assert(world.history.every((h) => h.champion), "todo registro tem campeão");

  // Estatísticas de país recalculadas = soma dos atletas.
  const countryGolds = Object.values(world.countries).reduce((s, c) => s + c.statistics.golds, 0);
  assertEqual(countryGolds, MEN_CATEGORIES.length);
});

test("cada luta gera vitória/derrota consistentes", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 7 });
  scheduleOpen(world, idGen, world.state.currentDate);
  new SimulationDirector({ world, random, idGen, eventBus: new EventBus() }).advanceDay();

  let wins = 0, losses = 0;
  for (const a of Object.values(world.athletes)) {
    wins += a.statistics.wins;
    losses += a.statistics.losses;
    assertEqual(a.statistics.fights, a.statistics.wins + a.statistics.losses);
  }
  // Em eliminação simples, nº de derrotas = nº de lutas; vitórias = mesmas lutas.
  assertEqual(wins, losses, "cada luta tem exatamente um vencedor e um perdedor");
});

test("eventos são publicados no Event Bus", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 3 });
  scheduleOpen(world, idGen, world.state.currentDate);
  const bus = new EventBus();
  const seen = {};
  for (const t of ["NewDayStarted", "CompetitionStarted", "CompetitionFinished", "RankingUpdated", "DayFinished"]) {
    bus.on(t, () => { seen[t] = (seen[t] || 0) + 1; });
  }
  new SimulationDirector({ world, random, idGen, eventBus: bus }).advanceDay();
  assertEqual(seen.NewDayStarted, 1);
  assertEqual(seen.CompetitionStarted, 1);
  assertEqual(seen.CompetitionFinished, 1);
  assert(seen.RankingUpdated >= 1);
  assertEqual(seen.DayFinished, 1);
});

test("salvamento persiste o mundo via StorageService", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 11 });
  scheduleOpen(world, idGen, world.state.currentDate);
  const storage = new StorageService(new MemoryBackend());
  new SimulationDirector({ world, random, idGen, eventBus: new EventBus(), storage }).advanceDay();
  const loaded = storage.load("world");
  assert(loaded, "mundo deveria ter sido salvo");
  assertEqual(loaded.state.processedDays, 1);
  assertEqual(Object.keys(loaded.history).length, MEN_CATEGORIES.length);
});

test("pipeline é determinístico: mesma seed → mesmo mundo final", () => {
  function run() {
    const { world, random, idGen } = buildSeedWorld({ seed: 999 });
    scheduleOpen(world, idGen, world.state.currentDate);
    new SimulationDirector({ world, random, idGen, eventBus: new EventBus() }).advanceDay();
    return JSON.stringify(world);
  }
  assertEqual(run(), run(), "mundos finais deveriam ser idênticos");
});
