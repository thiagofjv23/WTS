/**
 * Demo de console — prova o pipeline ponta a ponta.
 * Uso: node scripts/demo.mjs [seed]
 *
 * Monta o mundo, agenda um Aberto G-1 com as 4 categorias masculinas, avança
 * um dia e imprime campeões, um exemplo de chave e o ranking resultante.
 */

import { buildSeedWorld } from "../src/database/seed.js";
import { EventBus } from "../src/services/eventBus.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { createCompetition } from "../src/entities/competition.js";
import { scheduleCompetition } from "../src/engine/calendar.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { MEN_CATEGORIES, getWeightCategory } from "../src/config/weightCategories.js";

const seed = Number(process.argv[2]) || 20280101;

const { world, random, idGen } = buildSeedWorld({ seed });
const startDate = world.state.currentDate;

const competition = createCompetition({
  id: idGen.next("COMP"),
  name: "Aberto Mundial (demo)",
  gRank: "G-1",
  date: startDate,
  categoryIds: MEN_CATEGORIES.map((c) => c.id),
});
scheduleCompetition(world, idGen, competition);

const bus = new EventBus();
let fights = 0;
bus.on("FightFinished", () => fights++);
const storage = new StorageService(new MemoryBackend());
const director = new SimulationDirector({ world, random, idGen, eventBus: bus, storage });

const name = (id) => world.athletes[id]?.fullName ?? id;
const country = (id) => world.countries[world.athletes[id]?.countryId]?.code ?? "??";

console.log(`\n=== World Taekwondo Simulator — DEMO (seed ${seed}) ===`);
console.log(`Mundo: ${Object.keys(world.athletes).length} atletas, ${Object.keys(world.countries).length} países`);
console.log(`Competição: ${competition.name} [${competition.gRank}] em ${startDate}\n`);

director.advanceDay();

console.log(`Lutas simuladas no dia: ${fights}\n`);

console.log("── Pódios por categoria ──");
for (const cat of MEN_CATEGORIES) {
  const placements = competition.results[cat.id];
  const medal = (m) => placements.find((p) => p.medal === m);
  const g = medal("ouro"), s = medal("prata");
  const bronzes = placements.filter((p) => p.medal === "bronze");
  console.log(`\n${cat.name}:`);
  console.log(`  🥇 ${name(g.athleteId)} (${country(g.athleteId)})  +${g.rankingPointsEarned} pts`);
  console.log(`  🥈 ${name(s.athleteId)} (${country(s.athleteId)})  +${s.rankingPointsEarned} pts`);
  for (const b of bronzes) console.log(`  🥉 ${name(b.athleteId)} (${country(b.athleteId)})  +${b.rankingPointsEarned} pts`);
}

console.log("\n── Ranking mundial -58 kg (top 5) ──");
const ranking = world.rankings["WC-M-58"];
ranking.athleteIds.slice(0, 5).forEach((id, i) => {
  const a = world.athletes[id];
  console.log(`  ${String(i + 1).padStart(2)}. ${name(id).padEnd(22)} (${country(id)})  ${a.ranking.points} pts`);
});

console.log("\n── Quadro de medalhas por país ──");
const countries = Object.values(world.countries)
  .map((c) => ({ code: c.code, ...c.statistics }))
  .sort((a, b) => b.golds - a.golds || b.silvers - a.silvers || b.bronzes - a.bronzes);
for (const c of countries) {
  console.log(`  ${c.code}  🥇${c.golds} 🥈${c.silvers} 🥉${c.bronzes}   (${c.rankingPoints} pts)`);
}

console.log(`\nRegistros no histórico permanente: ${world.history.length}`);
console.log(`Data avançou para: ${world.state.currentDate}`);
console.log(`Save persistido: ${storage.has("world") ? "sim" : "não"}\n`);
