/**
 * Construtor do Seed World.
 *
 * Monta um mundo inicial pequeno e consistente a partir do seedConfig, usando
 * o RandomSystem (determinístico) e o IdGenerator. O resultado é um World
 * serializável pronto para a engine processar.
 */

import { RandomSystem } from "../services/random.js";
import { IdGenerator } from "../utils/ids.js";
import { createWorld, addCountry, addAthlete } from "../core/world.js";
import { createCountry } from "../entities/country.js";
import { generateAthletesForCountry } from "../engine/generation.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";
import {
  SEED_COUNTRIES,
  BASE_PER_CATEGORY,
  WORLD_START_DATE,
} from "./seedConfig.js";

/**
 * Constrói o mundo inicial.
 * @param {object} opts { seed }
 * @returns {{ world, random, idGen }}
 */
export function buildSeedWorld(opts = {}) {
  const { seed = 20280101 } = opts;
  const random = new RandomSystem(seed);
  const idGen = new IdGenerator();
  const world = createWorld({ seed, startDate: WORLD_START_DATE });

  for (const def of SEED_COUNTRIES) {
    const country = createCountry({
      id: idGen.next("CTR"),
      name: def.name,
      code: def.code,
      tier: def.tier,
    });
    addCountry(world, country);

    const perCategory = BASE_PER_CATEGORY * def.weight;
    const athletes = generateAthletesForCountry(random, idGen, {
      country,
      countryId: country.id,
      categories: MEN_CATEGORIES,
      perCategory,
      gender: "M",
      worldStartDate: WORLD_START_DATE,
    });
    for (const athlete of athletes) addAthlete(world, athlete);
  }

  // Guarda os estados dos serviços no mundo (para salvamento determinístico).
  world.rngState = random.getState();
  world.idState = idGen.getState();

  return { world, random, idGen };
}
