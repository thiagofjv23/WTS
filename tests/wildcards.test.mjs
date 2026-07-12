/**
 * Testes do sistema de Wildcards da President's Cup.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import { createAthlete } from "../src/entities/athlete.js";
import { createCompetition } from "../src/entities/competition.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";
import {
  grantPresidentsCupWildcards,
  wildcardEntrantsFor,
  consumeWildcards,
  isPresidentsCup,
  isContinentalChampionship,
} from "../src/engine/wildcards.js";
import { selectParticipants } from "../src/engine/participation.js";

const CAT = "WC-M-58";

function ath(id, countryId, pts) {
  const attributes = {};
  for (const k of ALL_ATTRIBUTES) attributes[k] = 70;
  const a = createAthlete({
    id, forename: id, surname: "T", countryId, gender: "M",
    birthDate: "2000-01-01", weightCategoryId: CAT, attributes,
  });
  a.ranking.points = pts;
  a.status = "ativo";
  return a;
}

// Europa: GER (G1 > G2), FRA (F1 > F2), ESP (S1). G1/F1/S1 são os nº 1 do país.
function makeWorld() {
  const world = { athletes: {}, countries: {}, rankings: {}, wildcards: [] };
  const add = (a) => (world.athletes[a.id] = a);
  const country = (id, code, ids) => (world.countries[id] = { id, code, name: code, athleteIds: ids });
  add(ath("G1", "C-GER", 100)); add(ath("G2", "C-GER", 50));
  add(ath("F1", "C-FRA", 90)); add(ath("F2", "C-FRA", 40));
  add(ath("S1", "C-ESP", 80));
  country("C-GER", "GER", ["G1", "G2"]);
  country("C-FRA", "FRA", ["F1", "F2"]);
  country("C-ESP", "ESP", ["S1"]);
  const order = ["G1", "F1", "S1", "G2", "F2"];
  order.forEach((id, i) => (world.athletes[id].ranking.position = i + 1));
  world.rankings[CAT] = { categoryId: CAT, athleteIds: order };
  return world;
}

const pcup = () => createCompetition({ id: "PCUP", name: "WT President's Cup - Europe", gRank: "G-3", date: "2026-06-06", categoryIds: [CAT] });
const continental = () => createCompetition({ id: "CONT", name: "European Senior Championships 2027", gRank: "G-4", date: "2027-05-11", categoryIds: [CAT] });

suite("Wildcards — classificação de eventos");

test("detecta President's Cup e Campeonato Continental", () => {
  assert(isPresidentsCup(pcup()), "President's Cup - Europe");
  assert(isContinentalChampionship(continental()), "European Championships");
  assert(!isPresidentsCup(continental()));
  assert(!isContinentalChampionship(pcup()));
});

suite("Wildcards — concessão (ordem de classificação)");

test("ordena campeão → vice → quem perdeu para o campeão", () => {
  const world = makeWorld();
  // Final: G2 venceu F2. Semis: G2 venceu S1 (S1 perdeu p/ campeão); F2 venceu G1.
  const placements = [
    { athleteId: "G2", placement: 1 },
    { athleteId: "F2", placement: 2 },
    { athleteId: "S1", placement: 3 },
    { athleteId: "G1", placement: 3 },
  ];
  const allMatches = [
    { athleteAId: "G2", athleteBId: "F2", winnerId: "G2" }, // final
    { athleteAId: "G2", athleteBId: "S1", winnerId: "G2" }, // semi
    { athleteAId: "F2", athleteBId: "G1", winnerId: "F2" }, // semi
  ];
  grantPresidentsCupWildcards(world, pcup(), { [CAT]: placements }, allMatches);
  assertEqual(world.wildcards.length, 1);
  // Entre os dois bronzes, S1 (perdeu para o campeão) vem antes de G1.
  assertEqual(world.wildcards[0].candidates, ["G2", "F2", "S1", "G1"]);
});

suite("Wildcards — resolução do agraciado");

test("campeão que NÃO é o nº 1 do país recebe a vaga", () => {
  const world = makeWorld();
  world.wildcards.push({ continent: "EUR", categoryId: CAT, date: "2026-06-06", candidates: ["G2", "F2", "S1", "G1"] });
  // Reps nacionais do continental: G1, F1, S1. G2 não é rep → recebe.
  assertEqual(wildcardEntrantsFor(world, continental(), CAT), ["G2"]);
});

test("se o campeão já é o nº 1 do país, a vaga passa adiante", () => {
  const world = makeWorld();
  world.wildcards.push({ continent: "EUR", categoryId: CAT, date: "2026-06-06", candidates: ["G1", "F2", "S1", "G2"] });
  // G1 é o nº 1 da GER (já entra como rep) → pula; F2 não é rep da FRA → recebe.
  assertEqual(wildcardEntrantsFor(world, continental(), CAT), ["F2"]);
});

test("wildcard futura só vale para continental posterior à Copa", () => {
  const world = makeWorld();
  world.wildcards.push({ continent: "EUR", categoryId: CAT, date: "2027-09-01", candidates: ["G2"] });
  // Copa depois do continental → ainda não vale.
  assertEqual(wildcardEntrantsFor(world, continental(), CAT), []);
});

suite("Wildcards — campo e consumo");

test("o agraciado entra ALÉM do limite de 1 por país", () => {
  const world = makeWorld();
  const cont = continental();
  cont.wildcards = { [CAT]: ["G2"] };
  const field = selectParticipants(world, cont, CAT, new RandomSystem(1)).map((a) => a.id);
  // Reps (G1, F1, S1) + wildcard G2 → GER com DOIS atletas.
  assert(field.includes("G1") && field.includes("G2"), "GER deveria ter dois atletas (rep + wildcard)");
  assert(field.includes("F1") && field.includes("S1"), "demais reps presentes");
  assert(!field.includes("F2"), "F2 não é rep nem wildcard");
});

test("consumeWildcards remove as pendentes do continente ao rodar o continental", () => {
  const world = makeWorld();
  world.wildcards.push({ continent: "EUR", categoryId: CAT, date: "2026-06-06", candidates: ["G2"] });
  consumeWildcards(world, continental());
  assertEqual(world.wildcards.length, 0);
});
