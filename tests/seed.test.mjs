/**
 * Testes do Passo 4 — Geração de atletas e seed do mundo.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { buildSeedWorld } from "../src/database/seed.js";
import { athletesInCategory, worldCounts } from "../src/core/world.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";
import { validateAttributes } from "../src/config/attributes.js";
import { SEED_COUNTRIES, BASE_PER_CATEGORY } from "../src/database/seedConfig.js";

function expectedAthleteCount() {
  const totalWeight = SEED_COUNTRIES.reduce((s, c) => s + c.weight, 0);
  return totalWeight * BASE_PER_CATEGORY * MEN_CATEGORIES.length;
}

suite("Seed World");

test("constrói mundo com países e atletas esperados", () => {
  const { world } = buildSeedWorld({ seed: 1 });
  const counts = worldCounts(world);
  assertEqual(counts.countries, SEED_COUNTRIES.length);
  assertEqual(counts.athletes, expectedAthleteCount());
});

test("é determinístico: mesma seed → mesmo mundo", () => {
  const a = buildSeedWorld({ seed: 42 }).world;
  const b = buildSeedWorld({ seed: 42 }).world;
  assertEqual(JSON.stringify(a), JSON.stringify(b), "mundos deveriam ser idênticos");
});

test("seeds diferentes → mundos diferentes", () => {
  const a = buildSeedWorld({ seed: 1 }).world;
  const b = buildSeedWorld({ seed: 2 }).world;
  assert(JSON.stringify(a) !== JSON.stringify(b), "mundos não deveriam coincidir");
});

test("todo atleta tem atributos válidos e relacionamentos por ID", () => {
  const { world } = buildSeedWorld({ seed: 7 });
  for (const a of Object.values(world.athletes)) {
    assert(validateAttributes(a.attributes), `atributos inválidos em ${a.id}`);
    assert(world.countries[a.countryId], `countryId inexistente: ${a.countryId}`);
    assert(
      MEN_CATEGORIES.some((c) => c.id === a.weightCategoryId),
      `categoria inválida: ${a.weightCategoryId}`
    );
    assertEqual(a.gender, "M");
  }
});

test("país referencia seus atletas (integridade bidirecional)", () => {
  const { world } = buildSeedWorld({ seed: 5 });
  for (const country of Object.values(world.countries)) {
    assert(country.athleteIds.length > 0, `${country.code} sem atletas`);
    for (const id of country.athleteIds) {
      assertEqual(world.athletes[id].countryId, country.id);
    }
  }
});

test("cada categoria tem atletas de todos os países", () => {
  const { world } = buildSeedWorld({ seed: 9 });
  for (const cat of MEN_CATEGORIES) {
    const inCat = athletesInCategory(world, cat.id);
    assert(inCat.length >= SEED_COUNTRIES.length, `poucos atletas em ${cat.id}`);
  }
});

test("KR gera mais atletas que BR (peso histórico)", () => {
  const { world } = buildSeedWorld({ seed: 3 });
  const byCode = {};
  for (const c of Object.values(world.countries)) {
    byCode[c.code] = c.athleteIds.length;
  }
  assert(byCode.KR > byCode.BR, "KR deveria ter mais atletas que BR");
});

test("mundo é JSON-serializável sem perda", () => {
  const { world } = buildSeedWorld({ seed: 11 });
  const round = JSON.parse(JSON.stringify(world));
  assertEqual(round, world);
});

test("mundo guarda estados de RNG e IDs para salvamento", () => {
  const { world } = buildSeedWorld({ seed: 13 });
  assert(typeof world.rngState === "number", "rngState deveria ser numérico");
  assert(world.idState.ATH > 0, "idState deveria registrar contador de atletas");
});
