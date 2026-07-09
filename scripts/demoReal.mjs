/**
 * Demo com atletas REAIS. Uso: node scripts/demoReal.mjs [seed]
 *
 * Monta o mundo a partir do ranking oficial WT, agenda um Grand Prix (G-2) com
 * campo de 32 por categoria, avança um dia e imprime pódios, ranking e medalhas.
 */

import { buildRealWorld } from "../src/database/realSeed.js";
import { EventBus } from "../src/services/eventBus.js";
import { createCompetition } from "../src/entities/competition.js";
import { scheduleCompetition } from "../src/engine/calendar.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const seed = Number(process.argv[2]) || 20260701;
const { world, random, idGen } = buildRealWorld({ seed });
const startDate = world.state.currentDate;

const name = (id) => world.athletes[id]?.fullName ?? id;
const ioc = (id) => world.countries[world.athletes[id]?.countryId]?.code ?? "??";

console.log(`\n=== World Taekwondo Simulator — DEMO REAL (seed ${seed}) ===`);
console.log(`Mundo: ${Object.keys(world.athletes).length} atletas reais, ${Object.keys(world.countries).length} países`);

console.log("\n── Líderes de ranking (dados reais, dia 0) ──");
for (const cat of MEN_CATEGORIES) {
  const top = world.athletes[world.rankings[cat.id].athleteIds[0]];
  console.log(`  ${cat.name.padEnd(7)} ${name(top.id)} (${ioc(top.id)})  ${top.ranking.points} pts`);
}

const comp = createCompetition({
  id: idGen.next("COMP"),
  name: "Grand Prix (demo)",
  gRank: "G-2",
  date: startDate,
  categoryIds: MEN_CATEGORIES.map((c) => c.id),
  fieldSize: 32,
});
scheduleCompetition(world, idGen, comp);

const bus = new EventBus();
let fights = 0;
bus.on("FightFinished", () => fights++);
new SimulationDirector({ world, random, idGen, eventBus: bus }).advanceDay();

console.log(`\n${comp.name} [${comp.gRank}] — ${fights} lutas simuladas`);
console.log("\n── Campeões ──");
for (const cat of MEN_CATEGORIES) {
  const p = comp.results[cat.id];
  const g = p.find((x) => x.medal === "ouro");
  const s = p.find((x) => x.medal === "prata");
  console.log(`  ${cat.name.padEnd(7)} 🥇 ${name(g.athleteId)} (${ioc(g.athleteId)}) +${g.rankingPointsEarned}   🥈 ${name(s.athleteId)} (${ioc(s.athleteId)})`);
}

console.log("\n── Ranking -80 kg após o Grand Prix (top 6) ──");
world.rankings["WC-M-80"].athleteIds.slice(0, 6).forEach((id, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. ${name(id).padEnd(34)} (${ioc(id)})  ${world.athletes[id].ranking.points} pts`);
});

console.log("\n── Top países por pontos de ranking ──");
Object.values(world.countries)
  .map((c) => ({ code: c.code, pts: c.statistics.rankingPoints, g: c.statistics.golds }))
  .sort((a, b) => b.pts - a.pts)
  .slice(0, 8)
  .forEach((c) => console.log(`  ${c.code}  ${c.pts.toFixed(1)} pts  🥇${c.g}`));

console.log(`\nData avançou para: ${world.state.currentDate}\n`);
