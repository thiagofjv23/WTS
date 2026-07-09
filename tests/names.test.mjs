/**
 * Testes do Passo 2 — Geração de nomes.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import {
  generateName,
  availableCountries,
  hasCountry,
} from "../src/services/nameGenerator.js";
import { NAMES } from "../src/database/names.js";

suite("NameGenerator");

test("dicionário contém os países do seed", () => {
  for (const c of ["KR", "TR", "BR", "CN"]) {
    assert(hasCountry(c), `faltou país ${c}`);
    assert(NAMES[c].forenames.length > 0, `${c} sem forenames`);
    assert(NAMES[c].surnames.length > 0, `${c} sem surnames`);
  }
});

test("availableCountries lista os 4 países", () => {
  assertEqual(availableCountries().sort(), ["BR", "CN", "KR", "TR"]);
});

test("gera nome completo válido a partir do pool", () => {
  const r = new RandomSystem(1);
  const { forename, surname, fullName } = generateName(r, "BR");
  assert(NAMES.BR.forenames.includes(forename), "forename fora do pool");
  assert(NAMES.BR.surnames.includes(surname), "surname fora do pool");
  assertEqual(fullName, `${forename} ${surname}`);
});

test("é determinístico com a mesma seed", () => {
  const a = new RandomSystem(2024);
  const b = new RandomSystem(2024);
  const na = Array.from({ length: 10 }, () => generateName(a, "KR").fullName);
  const nb = Array.from({ length: 10 }, () => generateName(b, "KR").fullName);
  assertEqual(na, nb, "geração deveria ser reproduzível");
});

test("produz variedade de nomes", () => {
  const r = new RandomSystem(7);
  const set = new Set();
  for (let i = 0; i < 100; i++) set.add(generateName(r, "TR").fullName);
  assert(set.size > 10, `variedade baixa: ${set.size} nomes distintos`);
});

test("país sem nomes lança erro claro", () => {
  const r = new RandomSystem(1);
  let threw = false;
  try {
    generateName(r, "ZZ");
  } catch (e) {
    threw = true;
    assert(/ZZ/.test(e.message), "erro deveria mencionar o país");
  }
  assert(threw, "deveria lançar para país inexistente");
});
