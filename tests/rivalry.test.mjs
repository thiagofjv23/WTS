/**
 * Testes do Passo 17 — Sistema de Rivalidades.
 */

import { suite, test, assert, assertEqual, assertClose } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import {
  pairKey,
  updateRivalriesFromCompetition,
  rivalryIntensity,
  rivalryLevel,
  rivalsOf,
  pruneRivalries,
} from "../src/engine/rivalry.js";
import { createCompetition } from "../src/entities/competition.js";
import { simulateFight } from "../src/engine/combat/fightManager.js";
import { createAthlete } from "../src/entities/athlete.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";

const MEN = ["WC-M-58", "WC-M-68", "WC-M-80", "WC-M-80+"];
function comp(gRank, date = "2027-06-01") {
  return createCompetition({ id: "C", name: "T", gRank, date, categoryIds: MEN });
}
function match(aId, bId, winnerId, round) {
  return { athleteAId: aId, athleteBId: bId, winnerId, round };
}

suite("Rivalry — dados e pesos");

test("pairKey é canônica (independe da ordem)", () => {
  assertEqual(pairKey("ATH-1", "ATH-9"), pairKey("ATH-9", "ATH-1"));
});

test("só finais/semifinais criam rivalidade", () => {
  const w = { rivalries: {} };
  updateRivalriesFromCompetition(w, comp("G-4"), [match("A", "B", "A", 8)]); // quartas
  assertEqual(Object.keys(w.rivalries).length, 0, "quartas não criam rivalidade");
  updateRivalriesFromCompetition(w, comp("G-4"), [match("A", "B", "A", 2)]); // final
  assertEqual(Object.keys(w.rivalries).length, 1, "final cria rivalidade");
});

test("uma rivalidade se constrói com o tempo (≥3 encontros decisivos)", () => {
  const w = { rivalries: {} };
  updateRivalriesFromCompetition(w, comp("G-20", "2027-01-01"), [match("A", "B", "A", 2)]);
  assertEqual(rivalryIntensity(w, "A", "B", "2027-01-01"), 0, "1 encontro não é rivalidade");
  assertEqual(rivalsOf(w, "A", "2027-01-01").length, 0, "não aparece na UI ainda");
  updateRivalriesFromCompetition(w, comp("G-20", "2027-02-01"), [match("A", "B", "A", 2)]);
  assertEqual(rivalryIntensity(w, "A", "B", "2027-02-01"), 0, "2 encontros ainda não");
  updateRivalriesFromCompetition(w, comp("G-20", "2027-03-01"), [match("A", "B", "A", 2)]);
  assert(rivalryIntensity(w, "A", "B", "2027-03-01") > 0, "3 encontros → vira rivalidade");
  assertEqual(rivalsOf(w, "A", "2027-03-01").length, 1);
});

test("grandes eventos pesam muito mais (após virar rivalidade)", () => {
  const w1 = { rivalries: {} };
  const w2 = { rivalries: {} };
  for (let i = 0; i < 3; i++) {
    updateRivalriesFromCompetition(w1, comp("G-1"), [match("A", "B", "A", 2)]);
    updateRivalriesFromCompetition(w2, comp("G-20"), [match("A", "B", "A", 2)]);
  }
  const i1 = rivalryIntensity(w1, "A", "B", "2027-06-01"); // 3×(3×1) = 9
  const i2 = rivalryIntensity(w2, "A", "B", "2027-06-01"); // 3×(3×20) = 180
  assert(i1 > 0 && i2 > 0, "3 encontros → rivalidade ativa nos dois");
  assert(i2 > i1 * 15, "Olimpíada deveria pesar muito mais que um G-1");
});

test("retrospecto e nº de encontros acumulam", () => {
  const w = { rivalries: {} };
  updateRivalriesFromCompetition(w, comp("G-4", "2027-01-01"), [match("A", "B", "A", 2)]);
  updateRivalriesFromCompetition(w, comp("G-4", "2027-06-01"), [match("A", "B", "B", 4)]);
  updateRivalriesFromCompetition(w, comp("G-4", "2027-09-01"), [match("A", "B", "A", 2)]);
  const rivals = rivalsOf(w, "A", "2027-09-01");
  assertEqual(rivals[0].meetings, 3);
  assertEqual(rivals[0].wins, 2);
  assertEqual(rivals[0].losses, 1);
});

test("seletivas contam para a rivalidade (mesma regra dos 3 encontros)", () => {
  const w = { rivalries: {} };
  const sel = createCompetition({
    id: "SEL", name: "Seletiva Nacional — Korea", gRank: "G-1",
    date: "2027-01-05", categoryIds: MEN, type: "selective", selectiveCountry: "KOR",
  });
  for (let i = 0; i < 2; i++) updateRivalriesFromCompetition(w, sel, [match("A", "B", "A", 2)]);
  assertEqual(rivalryIntensity(w, "A", "B", "2027-01-05"), 0, "2 finais de seletiva: ainda não");
  updateRivalriesFromCompetition(w, sel, [match("A", "B", "A", 2)]);
  assert(rivalryIntensity(w, "A", "B", "2027-01-05") > 0, "3 finais de seletiva formam rivalidade");
});

suite("Rivalry — decaimento e poda");

test("intensidade esfria com o tempo", () => {
  const w = { rivalries: {} };
  // 3 encontros no mesmo dia para virar rivalidade sem decaimento entre eles.
  for (let i = 0; i < 3; i++) {
    updateRivalriesFromCompetition(w, comp("G-20", "2027-01-01"), [match("A", "B", "A", 2)]);
  }
  const now = rivalryIntensity(w, "A", "B", "2027-01-01"); // 180
  const later = rivalryIntensity(w, "A", "B", "2029-07-01"); // ~30 meses → metade
  assertClose(later, now * 0.5, 5, "meia-vida ~30 meses");
});

test("rivalryLevel normaliza 0..1", () => {
  assertEqual(rivalryLevel(0), 0);
  assert(rivalryLevel(40) >= 1 - 1e-9);
  assert(rivalryLevel(80) === 1, "satura em 1");
});

test("pruneRivalries remove as fracas/frias", () => {
  const w = { rivalries: {} };
  updateRivalriesFromCompetition(w, comp("G-1", "2027-01-01"), [match("A", "B", "A", 4)]); // semi G-1 = 2
  pruneRivalries(w, "2027-01-01"); // 2 < MIN_INTENSITY(4) → poda
  assertEqual(Object.keys(w.rivalries).length, 0);
});

suite("Rivalry — efeito no combate");

function makeAthlete(id, level) {
  const attrs = {};
  for (const k of ALL_ATTRIBUTES) attrs[k] = level;
  return createAthlete({
    id, forename: id, surname: "T", countryId: "C", gender: "M",
    birthDate: "2004-01-01", weightCategoryId: "WC-M-68", attributes: attrs,
  });
}
function favoriteWinRate(rivalry, seed, N = 800) {
  const r = new RandomSystem(seed);
  let w = 0;
  for (let i = 0; i < N; i++) {
    if (simulateFight(r, makeAthlete("S", 78), makeAthlete("W", 66), { rivalry }).winnerId === "S") w++;
  }
  return w / N;
}

test("rivalidade aumenta a imprevisibilidade (favorito vence menos)", () => {
  const noRivalry = favoriteWinRate(0, 1);
  const withRivalry = favoriteWinRate(1, 1);
  assert(withRivalry < noRivalry, `rivalidade deveria gerar mais zebras (${withRivalry.toFixed(2)} < ${noRivalry.toFixed(2)})`);
  assert(withRivalry > 0.5, "mas o favorito ainda deve levar vantagem");
});

test("sem rivalidade, o resultado é o mesmo de antes (determinístico)", () => {
  const a = favoriteWinRate(0, 42);
  const b = favoriteWinRate(0, 42);
  assertEqual(a, b);
});
