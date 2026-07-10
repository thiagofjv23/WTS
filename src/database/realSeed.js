/**
 * Construtor do mundo a partir do roster REAL (híbrido).
 *
 * Consome src/database/realRoster.js (gerado do ranking oficial WT) e monta um
 * World com atletas reais: identidade e pontos reais; idade e atributos gerados
 * e ancorados na posição de ranking. Ver DECISIONS.md.
 */

import { RandomSystem } from "../services/random.js";
import { IdGenerator } from "../utils/ids.js";
import { createWorld, addCountry, addAthlete } from "../core/world.js";
import { createCountry } from "../entities/country.js";
import { generateRealAthlete } from "../engine/generation.js";
import { recomputeRankings } from "../engine/ranking.js";
import { recomputeCountryStatistics } from "../engine/consequence.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";
import { REAL_ROSTER, REAL_COUNTRIES } from "./realRoster.js";

// Início do mundo no começo do ano-calendário, alinhando com o calendário
// oficial 2026 (a 1ª temporada simulada é 2026, com todos os eventos à frente).
const WORLD_START_DATE = "2026-01-01";

/**
 * Constrói o mundo real.
 * @param {object} opts { seed }
 * @returns {{ world, random, idGen }}
 */
export function buildRealWorld(opts = {}) {
  const { seed = 20260701 } = opts;
  const random = new RandomSystem(seed);
  const idGen = new IdGenerator();
  const world = createWorld({ seed, startDate: WORLD_START_DATE });

  // Países: um por código IOC presente no roster.
  const countryIdByIoc = {};
  for (const [ioc, name] of Object.entries(REAL_COUNTRIES)) {
    const country = createCountry({
      id: idGen.next("CTR"),
      name,
      code: ioc,
    });
    addCountry(world, country);
    countryIdByIoc[ioc] = country.id;
  }

  // Atletas: por categoria, ancorando atributos na posição do ranking.
  for (const cat of MEN_CATEGORIES) {
    const list = REAL_ROSTER[cat.id] || [];
    const n = list.length;
    list.forEach((entry, i) => {
      const countryId = countryIdByIoc[entry.ioc];
      if (!countryId) return; // sem país mapeado (não deve ocorrer)
      const strength = n > 1 ? 1 - i / (n - 1) : 1;
      const athlete = generateRealAthlete(random, idGen, {
        entry,
        countryId,
        weightCategoryId: cat.id,
        strength,
        gender: "M",
        worldStartDate: WORLD_START_DATE,
      });
      addAthlete(world, athlete);
    });
  }

  // Rankings e estatísticas nacionais iniciais a partir dos pontos reais.
  recomputeRankings(world, WORLD_START_DATE);
  recomputeCountryStatistics(world);

  world.rngState = random.getState();
  world.idState = idGen.getState();
  return { world, random, idGen };
}
