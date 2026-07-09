/**
 * Demo de TEMPORADA com eventos e atletas REAIS.
 * Uso: node scripts/demoSeason.mjs [seed]
 *
 * Monta o mundo real, agenda a temporada com os eventos reais do ranking e
 * simula o ano inteiro, mostrando a evolução do ranking.
 */

import { buildRealWorld } from "../src/database/realSeed.js";
import { buildSeasonCalendar } from "../src/engine/season.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { EventBus } from "../src/services/eventBus.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const seed = Number(process.argv[2]) || 20260701;
const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

const { world, random, idGen } = buildRealWorld({ seed });
const name = (id) => world.athletes[id]?.fullName ?? id;
const ioc = (id) => world.countries[world.athletes[id]?.countryId]?.code ?? "??";

const comps = buildSeasonCalendar(world, idGen, { categoryFilter: MEN_IDS });
const lastDate = comps[comps.length - 1].date;

// Snapshot inicial.
const startRanking = {};
for (const cat of MEN_CATEGORIES) {
  startRanking[cat.id] = world.rankings[cat.id].athleteIds.slice(0, 10).map((id) => id);
}
const startPoints = {};
for (const a of Object.values(world.athletes)) startPoints[a.id] = a.ranking.points;

console.log(`\n=== World Taekwondo Simulator — TEMPORADA REAL (seed ${seed}) ===`);
console.log(`Mundo: ${Object.keys(world.athletes).length} atletas reais, ${Object.keys(world.countries).length} países`);
console.log(`Temporada: ${comps.length} eventos de ${comps[0].date} a ${lastDate}`);
const byG = comps.reduce((m, c) => ((m[c.gRank] = (m[c.gRank] || 0) + 1), m), {});
console.log(`Distribuição: ${JSON.stringify(byG)}\n`);

const bus = new EventBus();
let fights = 0, competitionsDone = 0;
bus.on("FightFinished", () => fights++);
bus.on("CompetitionFinished", () => competitionsDone++);

const director = new SimulationDirector({ world, random, idGen, eventBus: bus });
const days = director.advanceUntil(lastDate);

console.log(`Simulados ${days} dias · ${competitionsDone} competições · ${fights} lutas\n`);

// Contagem de títulos por atleta na temporada.
const titles = {};
for (const h of world.history) {
  if (h.champion) titles[h.champion] = (titles[h.champion] || 0) + 1;
}

for (const cat of MEN_CATEGORIES) {
  console.log(`── ${cat.name} — Ranking final (top 6) ──`);
  const finalTop = world.rankings[cat.id].athleteIds.slice(0, 6);
  finalTop.forEach((id, i) => {
    const prevPos = startRanking[cat.id].indexOf(id);
    const delta = prevPos === -1 ? "novo no top10" : prevPos === i ? "=" : (prevPos > i ? `▲${prevPos - i}` : `▼${i - prevPos}`);
    const gained = (world.athletes[id].ranking.points - startPoints[id]).toFixed(1);
    const t = titles[id] ? ` · ${titles[id]} título(s)` : "";
    console.log(`  ${String(i + 1).padStart(2)}. ${name(id).padEnd(32)} (${ioc(id)})  ${String(world.athletes[id].ranking.points).padStart(7)} pts  (+${gained}, ${delta})${t}`);
  });
  console.log("");
}

// Maiores campeões da temporada.
const topWinners = Object.entries(titles).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log("── Mais títulos na temporada ──");
for (const [id, n] of topWinners) console.log(`  ${n}× ${name(id)} (${ioc(id)})`);

console.log(`\nData final: ${world.state.currentDate} · registros no histórico: ${world.history.length}\n`);
