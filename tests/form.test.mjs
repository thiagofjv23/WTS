/**
 * Testes do Passo 14 — Form System (#3 periodização/pico de forma).
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import {
  eventForm,
  formMultiplier,
  formAdjustedAthlete,
  isTargetEvent,
  FORM_BASELINE,
} from "../src/engine/form.js";
import { createCompetition } from "../src/entities/competition.js";
import { createAthlete } from "../src/entities/athlete.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";

const MEN = ["WC-M-58", "WC-M-68", "WC-M-80", "WC-M-80+"];

function athlete(pos, formaAtual = 75) {
  const attrs = {};
  for (const k of ALL_ATTRIBUTES) attrs[k] = 70;
  attrs.formaAtual = formaAtual;
  const a = createAthlete({
    id: `A${pos}`, forename: "A", surname: "B", countryId: "C", gender: "M",
    birthDate: "2004-01-01", weightCategoryId: "WC-M-58", attributes: attrs,
  });
  a.ranking.position = pos;
  return a;
}
function comp(gRank) {
  return createCompetition({ id: "C", name: "T", gRank, date: "2027-06-01", categoryIds: MEN });
}

suite("Form System");

test("isTargetEvent: G-4+ é alvo, G-1/G-2 não", () => {
  assert(isTargetEvent(comp("G-4")) && isTargetEvent(comp("G-6")) && isTargetEvent(comp("G-10")));
  assert(!isTargetEvent(comp("G-1")) && !isTargetEvent(comp("G-2")));
});

test("elite: forma maior nos grandes que nos pequenos (em média)", () => {
  const r = new RandomSystem(1);
  const el = athlete(3);
  let big = 0, small = 0;
  const N = 400;
  for (let i = 0; i < N; i++) big += eventForm(el, comp("G-10"), r);
  for (let i = 0; i < N; i++) small += eventForm(el, comp("G-1"), r);
  assert(big / N > small / N + 10, `alvo (${(big / N).toFixed(1)}) deveria superar pequeno (${(small / N).toFixed(1)})`);
});

test("não-elite não periodiza (forma ~ base nos dois)", () => {
  const r = new RandomSystem(2);
  const base = athlete(200);
  let big = 0, small = 0;
  const N = 400;
  for (let i = 0; i < N; i++) big += eventForm(base, comp("G-10"), r);
  for (let i = 0; i < N; i++) small += eventForm(base, comp("G-1"), r);
  assert(Math.abs(big / N - small / N) < 5, "não-elite não deveria periodizar");
});

test("formMultiplier: base 75 → 1.0; maior forma → maior multiplicador", () => {
  assertEqual(formMultiplier(FORM_BASELINE), 1);
  assert(formMultiplier(90) > 1 && formMultiplier(50) < 1);
});

test("formAdjustedAthlete escala atributos e preserva id", () => {
  const a = athlete(1);
  const low = formAdjustedAthlete(a, 40);
  const high = formAdjustedAthlete(a, 95);
  assertEqual(low.id, a.id);
  assert(high.attributes.ataque > low.attributes.ataque, "forma alta → ataque maior");
  // não altera o atleta original
  assertEqual(a.attributes.ataque, 70);
});

test("é determinístico com a mesma seed", () => {
  const a = athlete(5);
  const f1 = eventForm(a, comp("G-6"), new RandomSystem(9));
  const f2 = eventForm(a, comp("G-6"), new RandomSystem(9));
  assertEqual(f1, f2);
});
