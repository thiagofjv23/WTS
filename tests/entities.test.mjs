/**
 * Testes do Passo 3 — Entidades, atributos e categorias de peso.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { IdGenerator } from "../src/utils/ids.js";
import {
  ALL_ATTRIBUTES,
  TECHNICAL,
  PHYSICAL,
  MENTAL,
  clampAttribute,
  validateAttributes,
} from "../src/config/attributes.js";
import {
  WEIGHT_CATEGORIES,
  MEN_CATEGORIES,
  getWeightCategory,
  categoriesForGender,
} from "../src/config/weightCategories.js";
import { createAthlete, ATHLETE_STATUS } from "../src/entities/athlete.js";
import { createCountry } from "../src/entities/country.js";

suite("IdGenerator");

test("gera IDs sequenciais por prefixo", () => {
  const ids = new IdGenerator();
  assertEqual(ids.next("ATH"), "ATH-1");
  assertEqual(ids.next("ATH"), "ATH-2");
  assertEqual(ids.next("CTR"), "CTR-1");
});

test("estado é serializável e restaurável (não reusa IDs)", () => {
  const ids = new IdGenerator();
  ids.next("ATH");
  ids.next("ATH");
  const state = ids.getState();
  const ids2 = new IdGenerator(state);
  assertEqual(ids2.next("ATH"), "ATH-3", "deveria continuar de onde parou");
});

suite("Atributos (config)");

test("clampAttribute mantém faixa 0–100", () => {
  assertEqual(clampAttribute(-5), 0);
  assertEqual(clampAttribute(150), 100);
  assertEqual(clampAttribute(73), 73);
});

test("validateAttributes exige atributos combativos na faixa", () => {
  const attrs = {};
  for (const k of [...TECHNICAL, ...PHYSICAL, ...MENTAL]) attrs[k] = 50;
  assert(validateAttributes(attrs), "deveria ser válido");
  attrs.ataque = 200;
  assert(!validateAttributes(attrs), "fora da faixa deveria falhar");
});

test("ALL_ATTRIBUTES não tem duplicatas", () => {
  assertEqual(new Set(ALL_ATTRIBUTES).size, ALL_ATTRIBUTES.length);
});

suite("Categorias de peso");

test("existem 4 categorias masculinas", () => {
  assertEqual(MEN_CATEGORIES.length, 4);
  assertEqual(WEIGHT_CATEGORIES.length, 4);
});

test("getWeightCategory e categoriesForGender funcionam", () => {
  assertEqual(getWeightCategory("WC-M-58").name, "-58 kg");
  assertEqual(categoriesForGender("M").length, 4);
  assertEqual(categoriesForGender("F").length, 0, "feminino ainda fora de escopo");
});

suite("Entidade Athlete");

function sampleAttributes(value = 60) {
  const attrs = {};
  for (const k of ALL_ATTRIBUTES) attrs[k] = value;
  return attrs;
}

test("cria atleta serializável com componentes esperados", () => {
  const a = createAthlete({
    id: "ATH-1",
    forename: "Lucas",
    surname: "Silva",
    countryId: "CTR-1",
    gender: "M",
    birthDate: "2004-05-01",
    weightCategoryId: "WC-M-68",
    attributes: sampleAttributes(),
  });
  assertEqual(a.fullName, "Lucas Silva");
  assertEqual(a.status, ATHLETE_STATUS.ACTIVE);
  assertEqual(a.ranking.points, 0);
  assertEqual(a.statistics.wins, 0);
  assert(Array.isArray(a.history), "history deveria ser array");
  // serializável sem perda
  const round = JSON.parse(JSON.stringify(a));
  assertEqual(round, a);
});

test("atleta sem campos obrigatórios lança erro", () => {
  let threw = false;
  try {
    createAthlete({ id: "X", forename: "A", surname: "B" });
  } catch {
    threw = true;
  }
  assert(threw, "deveria exigir countryId/weightCategoryId/attributes");
});

test("cópia de atributos é isolada (não compartilha referência)", () => {
  const attrs = sampleAttributes();
  const a = createAthlete({
    id: "ATH-2",
    forename: "Ji",
    surname: "Ho",
    countryId: "CTR-2",
    gender: "M",
    birthDate: "2003-01-01",
    weightCategoryId: "WC-M-58",
    attributes: attrs,
  });
  attrs.ataque = 99;
  assert(a.attributes.ataque !== 99, "atributos deveriam ser copiados");
});

suite("Entidade Country");

test("cria país com estatísticas zeradas", () => {
  const c = createCountry({ id: "CTR-1", name: "Brasil", code: "BR", tier: "1" });
  assertEqual(c.code, "BR");
  assertEqual(c.tier, "1");
  assertEqual(c.statistics.golds, 0);
  assertEqual(c.athleteIds, []);
});
