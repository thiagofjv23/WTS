/**
 * Testes do Passo 6 — Brackets e Competition System.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import {
  nextPowerOfTwo,
  standardSeedOrder,
  buildBracket,
} from "../src/engine/brackets.js";
import { createCompetition, G_RANKS } from "../src/entities/competition.js";
import {
  simulateCategory,
  simulateCompetition,
} from "../src/engine/competitionSystem.js";
import { createAthlete } from "../src/entities/athlete.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";

function makeAthlete(id, level) {
  const attrs = {};
  for (const k of ALL_ATTRIBUTES) attrs[k] = level;
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

function makeField(n, baseLevel = 60) {
  // Níveis distintos para ranking previsível: id "A1" mais forte que "A8".
  return Array.from({ length: n }, (_, i) => makeAthlete(`A${i + 1}`, baseLevel + (n - i)));
}

suite("Brackets");

test("nextPowerOfTwo ajusta para a próxima potência", () => {
  assertEqual(nextPowerOfTwo(2), 2);
  assertEqual(nextPowerOfTwo(4), 4);
  assertEqual(nextPowerOfTwo(5), 8);
  assertEqual(nextPowerOfTwo(9), 16);
  assertEqual(nextPowerOfTwo(18), 32);
});

test("standardSeedOrder separa os melhores seeds (size 8)", () => {
  assertEqual(standardSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test("buildBracket dá byes aos melhores ranqueados", () => {
  const field = makeField(6); // bracket 8, 2 byes
  const { size, slots, byes } = buildBracket(field);
  assertEqual(size, 8);
  assertEqual(byes, 2);
  // Seeds 1 e 2 (A1, A2) devem estar emparelhados contra BYE (null).
  const pos1 = slots.indexOf(field[0]);
  assertEqual(slots[pos1 ^ 1], null, "top seed deveria enfrentar bye");
});

suite("Competition System");

test("categoria produz exatamente um campeão e um vice", () => {
  const r = new RandomSystem(1);
  const { placements } = simulateCategory(r, makeField(8));
  const golds = placements.filter((p) => p.placement === 1);
  const silvers = placements.filter((p) => p.placement === 2);
  assertEqual(golds.length, 1);
  assertEqual(silvers.length, 1);
  assertEqual(golds[0].medal, "ouro");
});

test("todos os atletas recebem exatamente uma colocação", () => {
  const r = new RandomSystem(2);
  const field = makeField(16);
  const { placements } = simulateCategory(r, field);
  assertEqual(placements.length, field.length);
  const ids = new Set(placements.map((p) => p.athleteId));
  assertEqual(ids.size, field.length, "colocações não deveriam repetir atletas");
});

test("dois bronzes (padrão WT) para os semifinalistas", () => {
  const r = new RandomSystem(3);
  const { placements } = simulateCategory(r, makeField(8));
  const bronzes = placements.filter((p) => p.placement === 3);
  assertEqual(bronzes.length, 2, "deveria haver dois bronzes");
});

test("campo não-potência-de-dois (18) apura todos", () => {
  const r = new RandomSystem(4);
  const field = makeField(18);
  const { placements } = simulateCategory(r, field);
  assertEqual(placements.length, 18);
  assertEqual(placements.filter((p) => p.placement === 1).length, 1);
});

test("um único atleta é campeão automático", () => {
  const r = new RandomSystem(5);
  const { placements, matches } = simulateCategory(r, [makeAthlete("solo", 70)]);
  assertEqual(placements, [{ athleteId: "solo", placement: 1, medal: "ouro" }]);
  assertEqual(matches.length, 0);
});

test("favorito absoluto vence com frequência (byes + força)", () => {
  // A1 muito mais forte; deve ser campeão na grande maioria.
  let champWins = 0;
  const N = 60;
  for (let s = 0; s < N; s++) {
    const r = new RandomSystem(1000 + s);
    const field = [makeAthlete("TOP", 88), ...makeField(7, 55)];
    // TOP precisa ser seed 1: dar-lhe pontos de ranking.
    field[0].ranking.points = 999;
    const { placements } = simulateCategory(r, field);
    if (placements.find((p) => p.placement === 1).athleteId === "TOP") champWins++;
  }
  assert(champWins / N > 0.7, `favorito deveria vencer >70% dos torneios (${champWins}/${N})`);
});

test("é determinística: mesma seed → mesmos resultados", () => {
  const field = makeField(8);
  const a = simulateCategory(new RandomSystem(9), field);
  const b = simulateCategory(new RandomSystem(9), field);
  assertEqual(JSON.stringify(a), JSON.stringify(b));
});

test("simulateCompetition apura todas as categorias", () => {
  const r = new RandomSystem(7);
  const comp = createCompetition({
    id: "COMP-1",
    name: "Teste Open",
    gRank: "G-1",
    date: "2028-03-01",
    categoryIds: ["WC-M-58", "WC-M-68"],
  });
  const fields = {
    "WC-M-58": makeField(8),
    "WC-M-68": makeField(4),
  };
  const { byCategory, allMatches } = simulateCompetition(r, comp, (cid) => fields[cid]);
  assertEqual(Object.keys(byCategory).sort(), ["WC-M-58", "WC-M-68"]);
  assertEqual(byCategory["WC-M-58"].length, 8);
  assertEqual(byCategory["WC-M-68"].length, 4);
  assert(allMatches.every((m) => m.categoryId), "cada luta deve ter categoria");
  assertEqual(G_RANKS[comp.gRank].championPoints, 10);
});
