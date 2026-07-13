/**
 * Seleções Nacionais e Seletivas de janeiro.
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { createAthlete } from "../src/entities/athlete.js";
import { ALL_ATTRIBUTES } from "../src/config/attributes.js";
import {
  qualifyingCountries,
  scheduleNationalSelectives,
  selectiveParticipants,
  selectiveFightFn,
  assignNationalTeam,
  promoteReserveOnInjury,
  isSelective,
  SELECTIVE_MIN_ATHLETES,
} from "../src/engine/nationalTeams.js";
import { RandomSystem } from "../src/services/random.js";
import { simulateFight } from "../src/engine/combat/fightManager.js";

function newGame(seed = 20260101) {
  const g = new GameController({ storage: new StorageService(new MemoryBackend()) });
  g.newGame(seed);
  return g;
}

function ath(id, countryId, level = 70) {
  const attributes = {};
  for (const k of ALL_ATTRIBUTES) attributes[k] = level;
  const a = createAthlete({
    id, forename: id, surname: "T", countryId, gender: "M",
    birthDate: "2000-01-01", weightCategoryId: "WC-M-58", attributes,
  });
  a.status = "ativo";
  return a;
}

suite("Seleções — designação e reservas");

function miniWorld() {
  const world = { athletes: {}, countries: {}, nationalTeams: {} };
  for (const id of ["A", "B", "C", "D", "E"]) world.athletes[id] = ath(id, "C-KOR");
  world.countries["C-KOR"] = { id: "C-KOR", code: "KOR", name: "Korea", athleteIds: ["A", "B", "C", "D", "E"] };
  return world;
}

const placements = {
  "WC-M-58": [
    { athleteId: "A", placement: 1 },
    { athleteId: "B", placement: 2 },
    { athleteId: "C", placement: 3 },
    { athleteId: "D", placement: 3 },
    { athleteId: "E", placement: 5 },
  ],
};

test("finalistas viram titulares e os terceiros, reservas", () => {
  const world = miniWorld();
  assignNationalTeam(world, { selectiveCountry: "KOR", date: "2027-01-05" }, placements);
  assertEqual(world.athletes.A.nationalTeam, "titular");
  assertEqual(world.athletes.B.nationalTeam, "titular");
  assertEqual(world.athletes.C.nationalTeam, "reserva");
  assertEqual(world.athletes.D.nationalTeam, "reserva");
  assertEqual(world.athletes.E.nationalTeam ?? null, null, "5º não entra na seleção");
  assertEqual(world.nationalTeams.KOR["WC-M-58"].titulares, ["A", "B"]);
  assertEqual(world.nationalTeams.KOR["WC-M-58"].reservas, ["C", "D"]);
});

test("um reserva é convocado quando um titular se lesiona", () => {
  const world = miniWorld();
  assignNationalTeam(world, { selectiveCountry: "KOR", date: "2027-01-05" }, placements);
  world.athletes.A.status = "lesionado";
  const promoted = promoteReserveOnInjury(world, "A");
  assertEqual(promoted, "C", "primeiro reserva ativo assume");
  assertEqual(world.athletes.C.nationalTeam, "titular", "reserva entrou na seleção");
  // Lesionar quem não é titular não convoca ninguém.
  assertEqual(promoteReserveOnInjury(world, "E"), null);
});

test("nova seletiva limpa a designação do ano anterior", () => {
  const world = miniWorld();
  assignNationalTeam(world, { selectiveCountry: "KOR", date: "2027-01-05" }, placements);
  // No ano seguinte, E e A viram finalistas; B/C/D caem fora.
  const next = { "WC-M-58": [
    { athleteId: "E", placement: 1 }, { athleteId: "A", placement: 2 },
    { athleteId: "B", placement: 5 }, { athleteId: "C", placement: 5 },
  ]};
  assignNationalTeam(world, { selectiveCountry: "KOR", date: "2028-01-05" }, next);
  assertEqual(world.athletes.E.nationalTeam, "titular");
  assertEqual(world.athletes.A.nationalTeam, "titular");
  assertEqual(world.athletes.B.nationalTeam ?? null, null, "quem saiu perde a marcação");
  assertEqual(world.athletes.D.nationalTeam ?? null, null);
});

suite("Seletivas — menos zebras e campo sem teto");

test("melhor de N reduz zebras (o mais forte vence mais)", () => {
  const strong = ath("S", "C", 78);
  const weak = ath("W", "C", 66);
  const N = 400;
  const r1 = new RandomSystem(1);
  const r2 = new RandomSystem(1);
  let single = 0;
  for (let i = 0; i < N; i++) if (simulateFight(r1, strong, weak).winnerId === "S") single++;
  const bo5 = selectiveFightFn(5);
  let best = 0;
  for (let i = 0; i < N; i++) if (bo5(r2, strong, weak, {}).winnerId === "S") best++;
  assert(best > single, `melhor de 5 (${best}) deveria dar mais vitórias ao forte que 1 luta (${single})`);
  assert(best / N > 0.5, "o favorito ainda leva vantagem");
});

test("a seletiva não tem teto: mais de 32 participantes", () => {
  const world = { athletes: {}, countries: {} };
  const ids = [];
  for (let i = 0; i < 40; i++) {
    const a = ath(`A${i}`, "C-BIG");
    world.athletes[a.id] = a;
    ids.push(a.id);
  }
  world.countries["C-BIG"] = { id: "C-BIG", code: "BIG", name: "Big", athleteIds: ids };
  const field = selectiveParticipants(world, { selectiveCountry: "BIG", fieldSize: null }, "WC-M-58");
  assertEqual(field.length, 40, "todos os 40 entram (sem teto de 32)");
});

suite("Seletivas — agendamento");

test("só países com MAIS de 20 atletas realizam seletiva, em janeiro", () => {
  const { world, idGen } = buildRealWorld({ seed: 1 });
  const q = qualifyingCountries(world);
  assert(q.length > 0, "deveria haver países grandes");
  assert(q.every((c) => c.athleteIds.length > SELECTIVE_MIN_ATHLETES), "todos com >20");
  const sels = scheduleNationalSelectives(world, idGen, { year: 2026 });
  assertEqual(sels.length, q.length, "uma seletiva por país elegível");
  assert(sels.every((s) => isSelective(s) && s.date.startsWith("2026-01")), "seletivas em janeiro");
});

suite("Seletivas — integração (não polui ranking/histórico)");

test("após janeiro há seleções marcadas e as seletivas não pontuam", () => {
  const g = newGame();
  g.advanceOneMonth(); // processa as seletivas de janeiro/2026

  const kor = g.world.nationalTeams["KOR"];
  assert(kor && kor["WC-M-58"] && kor["WC-M-58"].titulares.length >= 1, "KOR deveria ter seleção");
  const titId = kor["WC-M-58"].titulares[0];
  assertEqual(g.getAthlete(titId).nationalTeam, "titular", "titular marcado na ficha");

  const selectiveIds = new Set(
    Object.values(g.world.competitions).filter((c) => c.type === "selective").map((c) => c.id)
  );
  assert(selectiveIds.size > 0, "deveria haver seletivas");
  // Nenhum ponto de ranking creditado por seletiva.
  let leaked = false;
  for (const a of Object.values(g.world.athletes)) {
    for (const e of a.pointsLedger || []) if (selectiveIds.has(e.competitionId)) leaked = true;
  }
  assert(!leaked, "seletiva não deve creditar pontos de ranking");
  // Nenhuma seletiva no histórico permanente.
  assert(!g.world.history.some((h) => selectiveIds.has(h.competitionId)), "seletiva fora do histórico");
});
