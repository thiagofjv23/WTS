/**
 * Testes do Passo 5 — Combat Framework.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import { createAthlete } from "../src/entities/athlete.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";
import { simulateFight } from "../src/engine/combat/fightManager.js";
import { combatRating } from "../src/engine/combat/probability.js";

/** Cria um atleta de teste com todos os atributos num mesmo nível. */
function makeAthlete(id, level, overrides = {}) {
  const attrs = {};
  for (const k of ALL_ATTRIBUTES) attrs[k] = level;
  Object.assign(attrs, overrides);
  return createAthlete({
    id,
    forename: id,
    surname: "T",
    countryId: "CTR-1",
    gender: "M",
    birthDate: "2004-01-01",
    weightCategoryId: "WC-M-68",
    attributes: attrs,
  });
}

suite("Combat — resultado técnico");

test("produz um vencedor e um perdedor distintos", () => {
  const r = new RandomSystem(1);
  const a = makeAthlete("A", 70);
  const b = makeAthlete("B", 70);
  const res = simulateFight(r, a, b);
  assert(res.winnerId === "A" || res.winnerId === "B");
  assert(res.winnerId !== res.loserId, "vencedor e perdedor devem diferir");
});

test("vencedor ganhou 2 rounds (melhor de 3)", () => {
  const r = new RandomSystem(5);
  const a = makeAthlete("A", 65);
  const b = makeAthlete("B", 72);
  const res = simulateFight(r, a, b);
  const winRounds = res.roundsWon[res.winnerId];
  assert(winRounds >= 2, `vencedor deveria ter 2 rounds, teve ${winRounds}`);
  assert(res.rounds.length >= 2 && res.rounds.length <= 3, "rounds entre 2 e 3");
});

test("é determinístico: mesma seed → mesmo resultado", () => {
  const a = makeAthlete("A", 68);
  const b = makeAthlete("B", 71);
  const r1 = simulateFight(new RandomSystem(123), a, b);
  const r2 = simulateFight(new RandomSystem(123), a, b);
  assertEqual(JSON.stringify(r1), JSON.stringify(r2));
});

test("registra estatísticas coerentes", () => {
  const r = new RandomSystem(9);
  const a = makeAthlete("A", 70);
  const b = makeAthlete("B", 70);
  const res = simulateFight(r, a, b);
  for (const id of ["A", "B"]) {
    const s = res.stats[id];
    assert(s.attemptsTotal > 0, "deveria haver tentativas");
    assert(s.landed <= s.attemptsTotal + 50, "acertos plausíveis");
    assert(s.points >= 0, "pontos não-negativos");
  }
});

suite("Combat — equilíbrio estatístico");

test("favorito claro vence a maioria, mas não 100% (zebras existem)", () => {
  const strong = makeAthlete("S", 82);
  const weak = makeAthlete("W", 58);
  let strongWins = 0;
  const N = 400;
  // Uma única corrente de aleatoriedade para N lutas independentes.
  const r = new RandomSystem(2024);
  for (let i = 0; i < N; i++) {
    const res = simulateFight(r, strong, weak);
    if (res.winnerId === "S") strongWins++;
  }
  const rate = strongWins / N;
  assert(rate > 0.75, `favorito deveria vencer >75%, venceu ${(rate * 100).toFixed(1)}%`);
  assert(rate < 1.0, "zebras deveriam ocorrer ocasionalmente");
});

test("atletas iguais → resultado próximo de 50/50", () => {
  const a = makeAthlete("A", 70);
  const b = makeAthlete("B", 70);
  let aWins = 0;
  const N = 400;
  const r = new RandomSystem(777);
  for (let i = 0; i < N; i++) {
    if (simulateFight(r, a, b).winnerId === "A") aWins++;
  }
  const rate = aWins / N;
  assert(rate > 0.4 && rate < 0.6, `esperado ~50%, obtido ${(rate * 100).toFixed(1)}%`);
});

test("combatRating cresce com o nível do atleta", () => {
  assert(combatRating(makeAthlete("x", 80).attributes) > combatRating(makeAthlete("y", 50).attributes));
});
