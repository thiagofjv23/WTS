/**
 * Testes do Passo 8 — Roster real, seed híbrido e entry list.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { buildRealWorld } from "../src/database/realSeed.js";
import { REAL_ROSTER, REAL_COUNTRIES } from "../src/database/realRoster.js";
import { worldCounts, athletesInCategory } from "../src/core/world.js";
import { validateAttributes } from "../src/config/attributes.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";
import { selectEntrants } from "../src/engine/competitionSystem.js";
import { baseFromStrength, generateAge } from "../src/engine/generation.js";
import { RandomSystem } from "../src/services/random.js";

suite("Roster real (dados)");

test("roster tem as 4 categorias masculinas com atletas", () => {
  for (const cat of MEN_CATEGORIES) {
    assert(REAL_ROSTER[cat.id]?.length > 0, `sem atletas em ${cat.id}`);
  }
});

test("entradas do roster têm nome, IOC e pontos", () => {
  const first = REAL_ROSTER["WC-M-58"][0];
  assert(first.name && first.ioc && typeof first.points === "number");
  assert(REAL_COUNTRIES[first.ioc], "IOC do topo deveria ter país");
});

suite("Seed híbrido (buildRealWorld)");

test("constrói mundo com atletas e países reais", () => {
  const { world } = buildRealWorld({ seed: 1 });
  const counts = worldCounts(world);
  const totalRoster = MEN_CATEGORIES.reduce((s, c) => s + REAL_ROSTER[c.id].length, 0);
  assertEqual(counts.athletes, totalRoster);
  assert(counts.countries > 50, "deveria haver muitos países");
});

test("preserva identidade e pontos reais; gera atributos válidos", () => {
  const { world } = buildRealWorld({ seed: 2 });
  for (const a of Object.values(world.athletes)) {
    assert(a.fullName && a.fullName.length > 1, "nome real ausente");
    assert(validateAttributes(a.attributes), `atributos inválidos em ${a.id}`);
    assert(a.ranking.points >= 0, "pontos reais ausentes");
    assert(a.memberNumber, "memberNumber real ausente");
    // idade plausível
    const birthYear = Number(a.birthDate.slice(0, 4));
    const age = 2026 - birthYear;
    assert(age >= 16 && age <= 36, `idade implausível: ${age}`);
  }
});

test("o nº 1 do ranking é o líder real da categoria", () => {
  const { world } = buildRealWorld({ seed: 3 });
  for (const cat of MEN_CATEGORIES) {
    const topReal = REAL_ROSTER[cat.id][0].name;
    const rankId = world.rankings[cat.id].athleteIds[0];
    assertEqual(world.athletes[rankId].fullName, topReal, `líder incorreto em ${cat.id}`);
  }
});

test("atletas mais bem ranqueados tendem a ser mais fortes", () => {
  const { world } = buildRealWorld({ seed: 4 });
  const list = athletesInCategory(world, "WC-M-58").sort(
    (a, b) => b.ranking.points - a.ranking.points
  );
  const avg = (arr) =>
    arr.reduce((s, a) => s + (a.attributes.ataque + a.attributes.defesa) / 2, 0) / arr.length;
  const top = avg(list.slice(0, 20));
  const bottom = avg(list.slice(-20));
  assert(top > bottom, `topo (${top.toFixed(1)}) deveria superar base (${bottom.toFixed(1)})`);
});

test("é determinístico: mesma seed → mundo idêntico", () => {
  const a = buildRealWorld({ seed: 9 }).world;
  const b = buildRealWorld({ seed: 9 }).world;
  assertEqual(JSON.stringify(a), JSON.stringify(b));
});

test("mundo real é JSON-serializável", () => {
  const { world } = buildRealWorld({ seed: 5 });
  const round = JSON.parse(JSON.stringify(world));
  assertEqual(round, world);
});

suite("Geração ancorada");

test("baseFromStrength cresce com a força", () => {
  assert(baseFromStrength(1) > baseFromStrength(0.5));
  assert(baseFromStrength(0.5) > baseFromStrength(0));
  assertEqual(baseFromStrength(0), 52);
  assertEqual(baseFromStrength(1), 82);
});

test("generateAge fica na faixa competitiva", () => {
  const r = new RandomSystem(1);
  for (let i = 0; i < 500; i++) {
    const age = generateAge(r);
    assert(age >= 17 && age <= 34, `idade fora da faixa: ${age}`);
  }
});

suite("Entry list");

test("selectEntrants limita ao fieldSize pelos melhores ranqueados", () => {
  const athletes = Array.from({ length: 50 }, (_, i) => ({
    id: `A${i}`,
    ranking: { points: i },
    attributes: {},
  }));
  const entrants = selectEntrants(athletes, 8);
  assertEqual(entrants.length, 8);
  // Deveriam ser os de maior pontuação (49..42).
  assert(entrants.every((a) => a.ranking.points >= 42), "entrou atleta de baixo ranking");
});

test("selectEntrants sem fieldSize retorna todos", () => {
  const athletes = [{ id: "x", ranking: { points: 1 }, attributes: {} }];
  assertEqual(selectEntrants(athletes, null).length, 1);
});
