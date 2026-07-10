/**
 * Demo de MÚLTIPLAS TEMPORADAS com o calendário oficial 2026 (Kyorugi/Senior).
 * Uso: node scripts/demoMultiSeason.mjs [seed] [numSeasons]
 *
 * Simula temporadas consecutivas (2027, 2028, ...) repetindo a estrutura anual
 * do calendário real, com decaimento de pontos de 4 anos (§5).
 */

import { buildRealWorld } from "../src/database/realSeed.js";
import { buildSeasonCalendar } from "../src/engine/season.js";
import { SimulationDirector } from "../src/engine/simulationDirector.js";
import { EventBus } from "../src/services/eventBus.js";
import { CALENDAR_2026 } from "../src/database/calendar2026.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";

const seed = Number(process.argv[2]) || 20260701;
const numSeasons = Number(process.argv[3]) || 4;
const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);
const CAT = "WC-M-80";

const { world, random, idGen } = buildRealWorld({ seed });
const name = (id) => world.athletes[id]?.fullName ?? id;
const ioc = (id) => world.countries[world.athletes[id]?.countryId]?.code ?? "??";

console.log(`\n=== WT Simulator — MÚLTIPLAS TEMPORADAS (seed ${seed}) ===`);
console.log(`Mundo: ${Object.keys(world.athletes).length} atletas reais`);
console.log(`Calendário/temporada: ${CALENDAR_2026.length} eventos (oficial 2026)`);
console.log(`Simulando ${numSeasons} temporadas a partir de 2027.\n`);

const bus = new EventBus();
let totalFights = 0;
bus.on("FightFinished", () => totalFights++);
const director = new SimulationDirector({ world, random, idGen, eventBus: bus });

function snapshotTop(catId, k = 5) {
  return world.rankings[catId].athleteIds.slice(0, k).map((id) => ({
    id, pts: world.athletes[id].ranking.points,
  }));
}

console.log(`── ${CAT} — antes (standings reais de 2026) ──`);
snapshotTop(CAT).forEach((r, i) =>
  console.log(`  ${i + 1}. ${name(r.id).padEnd(34)} (${ioc(r.id)})  ${r.pts} pts`)
);

for (let s = 0; s < numSeasons; s++) {
  const year = 2026 + s;
  const comps = buildSeasonCalendar(world, idGen, { yearOffset: s, categoryFilter: MEN_IDS });
  director.advanceUntil(comps[comps.length - 1].date);
  const champ = snapshotTop(CAT, 1)[0];
  console.log(`\n▶ Temporada ${year}: ${comps.length} eventos · líder ${CAT}: ${name(champ.id)} (${ioc(champ.id)}) ${champ.pts} pts`);
}

console.log(`\nTotal de lutas simuladas: ${totalFights}`);

console.log(`\n── ${CAT} — depois de ${numSeasons} temporadas ──`);
snapshotTop(CAT).forEach((r, i) =>
  console.log(`  ${i + 1}. ${name(r.id).padEnd(34)} (${ioc(r.id)})  ${r.pts} pts`)
);

// Efeito do decaimento sobre os pontos-semente (reais de 2026).
console.log("\n── Decaimento dos pontos reais de 2026 (amostra) ──");
const sample = Object.values(world.athletes)
  .filter((a) => a.pointsLedger[0]?.gRank === "seed")
  .slice(0, 4);
for (const a of sample) {
  const seedPts = a.pointsLedger[0].points;
  const earnedEntries = a.pointsLedger.length - 1;
  console.log(`  ${name(a.id).padEnd(30)} seed 2026=${seedPts} → hoje conta parte disso + ${earnedEntries} resultados novos`);
}

console.log(`\nData final: ${world.state.currentDate} · histórico: ${world.history.length} registros\n`);
