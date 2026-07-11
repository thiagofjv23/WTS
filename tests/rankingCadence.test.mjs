/**
 * Cadência mensal do ranking — o ranking materializado (posições/pontos
 * visíveis) só muda no dia 1 de cada mês; entre atualizações os pontos entram
 * no ledger, mas o ranking fica congelado. O decaimento (§5) é avaliado na data
 * do recálculo mensal.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { buildSeedWorld } from "../src/database/seed.js";
import { createCompetition } from "../src/entities/competition.js";
import { scheduleCompetition } from "../src/engine/calendar.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { EventBus } from "../src/services/eventBus.js";
import { effectivePoints, decayFactor } from "../src/engine/ranking.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const CAT = MEN_CATEGORIES[0].id;

/** Agenda um Aberto (G-4, sem teto anual) nas 4 categorias, numa data. */
function scheduleOpen(world, idGen, date) {
  const comp = createCompetition({
    id: idGen.next("COMP"),
    name: "Aberto de Teste",
    gRank: "G-4",
    date,
    categoryIds: MEN_CATEGORIES.map((c) => c.id),
  });
  scheduleCompetition(world, idGen, comp);
  return comp;
}

suite("Ranking — cadência mensal");

test("competição no meio do mês credita o ledger mas NÃO mexe no ranking visível", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 20280110 });
  const comp = scheduleOpen(world, idGen, "2028-01-10");
  const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });

  // Avança até o dia seguinte à competição (ainda em janeiro).
  director.advanceUntil("2028-01-11");
  assertEqual(world.competitions[comp.id].status, "concluida");

  const champId = comp.results[CAT].find((p) => p.placement === 1).athleteId;
  const champ = world.athletes[champId];

  // O ledger recebeu a vitória...
  assert(
    champ.pointsLedger.some((e) => e.competitionId === comp.id),
    "a vitória deveria estar no ledger"
  );
  // ...mas o ranking materializado ainda é o do dia 1 (não conta a vitória).
  const ptsMid = champ.ranking.points;
  assert(
    effectivePoints(champ, world.state.currentDate) > ptsMid,
    "os pontos efetivos (com a vitória) deveriam superar os materializados congelados"
  );

  // Avançar mais dias dentro de janeiro NÃO altera o ranking visível.
  director.advanceUntil("2028-01-28");
  assertEqual(champ.ranking.points, ptsMid, "ranking congelado durante o mês");

  // No dia 1 de fevereiro o ranking incorpora a vitória de janeiro.
  director.advanceUntil("2028-02-01");
  assert(champ.ranking.points > ptsMid, "no dia 1 o ranking incorpora os resultados do mês");
  assertEqual(
    champ.ranking.points,
    effectivePoints(champ, "2028-02-01"),
    "o ranking do dia 1 = pontos efetivos naquela data"
  );
});

test("RankingUpdated só é emitido no dia 1 do mês", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 20280102 });
  scheduleOpen(world, idGen, "2028-01-15");
  const bus = new EventBus();
  let updates = 0;
  bus.on("RankingUpdated", () => { updates += 1; });
  const director = new SimulationDirector({ world, random, idGen, eventBus: bus });

  // Do dia 1/jan (inclusive) até 31/jan: um único dia 1 no intervalo.
  director.advanceUntil("2028-01-31");
  assertEqual(updates, 1, "apenas o 1º de janeiro dispara o recálculo");

  // Cruza para fevereiro → mais um recálculo (dia 1/fev).
  director.advanceUntil("2028-02-01");
  assertEqual(updates, 2, "1º de fevereiro dispara o segundo recálculo");
});

test("o decaimento (§5) é aplicado na data do recálculo mensal", () => {
  const { world, random, idGen } = buildSeedWorld({ seed: 20280103 });
  const comp = scheduleOpen(world, idGen, "2028-03-15");
  const director = new SimulationDirector({ world, random, idGen, eventBus: new EventBus() });

  // Disputa o evento de março/2028 e materializa o ranking em abril/2028.
  director.advanceUntil("2028-04-01");
  const champId = comp.results[CAT].find((p) => p.placement === 1).athleteId;
  const champ = world.athletes[champId];
  const entry = champ.pointsLedger.find((e) => e.competitionId === comp.id);
  assert(entry, "vitória no ledger");

  // Em abril/2028 o resultado de março ainda está na faixa cheia (100%).
  assertEqual(decayFactor(0), 1);
  const ptsYear0 = champ.ranking.points;

  // Salta ~13 meses: o ranking vigente em abril/2029 já mostra o resultado de
  // março/2028 caído para 75% (primeiro aniversário — perdeu força em março).
  director.advanceUntil("2029-04-01");
  assertEqual(decayFactor(13), 0.75);
  const contribYear0 = entry.points * 1;
  const contribYear1 = entry.points * 0.75;
  assert(
    ptsYear0 - champ.ranking.points >= (contribYear0 - contribYear1) - 0.01,
    "a queda do ranking deveria refletir o decaimento do resultado de março"
  );
});
