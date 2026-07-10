/**
 * Testes do Passo 13 — Travas de elegibilidade e continentes.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { continentOf, isArab } from "../src/config/continents.js";
import { classifyEvent, isEligible, applyNationalLimit } from "../src/engine/eligibility.js";
import { selectParticipants } from "../src/engine/participation.js";
import { createCompetition } from "../src/entities/competition.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { RandomSystem } from "../src/services/random.js";
import { REAL_COUNTRIES } from "../src/database/realRoster.js";

const MEN = ["WC-M-58", "WC-M-68", "WC-M-80", "WC-M-80+"];

function comp(name, gRank) {
  return createCompetition({ id: "C1", name, gRank, date: "2027-05-01", categoryIds: MEN });
}

suite("Continentes (dados)");

test("todos os países do roster têm continente (exceto refugiados)", () => {
  let missing = [];
  for (const ioc of Object.keys(REAL_COUNTRIES)) {
    if (ioc === "TRT") continue;
    if (!continentOf(ioc)) missing.push(ioc);
  }
  assertEqual(missing, [], `sem continente: ${missing.join(", ")}`);
});

test("continentes conhecidos batem", () => {
  assertEqual(continentOf("BRA"), "PAM");
  assertEqual(continentOf("KOR"), "ASI");
  assertEqual(continentOf("GER"), "EUR");
  assertEqual(continentOf("EGY"), "AFR");
  assertEqual(continentOf("AUS"), "OCE");
  assertEqual(continentOf("TRT"), null);
});

test("países árabes", () => {
  assert(isArab("EGY") && isArab("JOR") && isArab("KSA"));
  assert(!isArab("BRA") && !isArab("KOR"));
});

suite("Classificação de eventos");

test("Grand Prix Series/Final → lock de ranking", () => {
  assertEqual(classifyEvent(comp("Roma Grand Prix Series", "G-6")).rankingLockTopN, 32);
  assertEqual(classifyEvent(comp("Astana Grand Prix Final", "G-10")).rankingLockTopN, 16);
});

test("campeonato continental → continente + limite nacional", () => {
  const r = classifyEvent(comp("European Senior Championships 2026", "G-4"));
  assertEqual(r.continent, "EUR");
  assertEqual(r.nationalLimit, 1);
  assert(r.invitational);
});

test("President's Cup → continente sem limite nacional", () => {
  const r = classifyEvent(comp("WT President's Cup - Asia", "G-3"));
  assertEqual(r.continent, "ASI");
  assertEqual(r.nationalLimit, null);
});

test("evento árabe → arabOnly", () => {
  assert(classifyEvent(comp("Fujairah 6th Arab Cup 2026", "G-1")).arabOnly);
});

test("Open comum não tem travas", () => {
  const r = classifyEvent(comp("Austria Open", "G-1"));
  assertEqual(r.continent, null);
  assertEqual(r.rankingLockTopN, null);
  assert(!r.arabOnly && !r.invitational);
});

suite("Elegibilidade e seleção");

test("só o continente entra no campeonato continental", () => {
  const { world, random } = buildRealWorld({ seed: 1 });
  const c = comp("European Senior Championships 2026", "G-4");
  const field = selectParticipants(world, c, "WC-M-58", random);
  for (const a of field) {
    assertEqual(continentOf(world.countries[a.countryId].code), "EUR", `intruso: ${a.fullName}`);
  }
});

test("limite nacional: 1 país por categoria no continental", () => {
  const { world, random } = buildRealWorld({ seed: 2 });
  const c = comp("27th Asian Taekwondo Championships", "G-4");
  const field = selectParticipants(world, c, "WC-M-68", random);
  const codes = field.map((a) => world.countries[a.countryId].code);
  assertEqual(codes.length, new Set(codes).size, "país repetido no continental");
});

test("Grand Prix: só top 32 do ranking", () => {
  const { world, random } = buildRealWorld({ seed: 3 });
  const c = createCompetition({ id: "GP", name: "Roma Grand Prix Series", gRank: "G-6", date: "2026-06-05", categoryIds: MEN });
  const field = selectParticipants(world, c, "WC-M-58", random);
  for (const a of field) assert(a.ranking.position <= 32, `${a.fullName} fora do top 32 (${a.ranking.position})`);
});

test("Arab Cup: só países árabes", () => {
  const { world, random } = buildRealWorld({ seed: 4 });
  const c = comp("Fujairah 6th Arab Cup 2026", "G-1");
  const field = selectParticipants(world, c, "WC-M-80", random);
  assert(field.length > 0, "deveria haver árabes");
  for (const a of field) assert(isArab(world.countries[a.countryId].code), `não-árabe: ${a.fullName}`);
});

test("applyNationalLimit mantém o melhor por país", () => {
  const { world } = buildRealWorld({ seed: 5 });
  const pool = Object.values(world.athletes).filter((a) => a.weightCategoryId === "WC-M-58").slice(0, 40);
  const limited = applyNationalLimit(pool, world, 1);
  const codes = limited.map((a) => world.countries[a.countryId].code);
  assertEqual(codes.length, new Set(codes).size);
});
