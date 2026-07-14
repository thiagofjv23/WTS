/**
 * Jogos Olímpicos e classificação olímpica (config-driven, 3 ciclos).
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { buildRealWorld } from "../src/database/realSeed.js";
import { recomputeRankings } from "../src/engine/ranking.js";
import { MEN_CATEGORIES } from "../src/config/weightCategories.js";
import { continentOf } from "../src/config/continents.js";
import {
  getOlympicConfig,
  isOlympicYear,
  olympicHost,
} from "../src/config/olympics.js";
import {
  isOlympics,
  isOlympicContinentalQual,
  runOlympicRankingQual,
  continentalQualParticipants,
  categoryQuotas,
} from "../src/engine/olympics.js";
import { simulateCategory } from "../src/engine/competitionSystem.js";
import { RandomSystem } from "../src/services/random.js";

const MEN = MEN_CATEGORIES.map((c) => c.id);

function newGame(seed = 20260101) {
  const g = new GameController({ storage: new StorageService(new MemoryBackend(), { deferMs: 600000 }) });
  g.newGame(seed);
  return g;
}

suite("Olimpíadas — configuração");

test("anos olímpicos a cada 4 anos a partir de 2028", () => {
  assert(isOlympicYear(2028) && isOlympicYear(2032) && isOlympicYear(2036));
  assert(!isOlympicYear(2026) && !isOlympicYear(2029) && !isOlympicYear(2030) && !isOlympicYear(2031));
});

test("sedes e config do ciclo (modelo Paris 2024)", () => {
  assertEqual(olympicHost(2028).country, "USA");
  assertEqual(olympicHost(2028).city, "Los Angeles");
  assertEqual(olympicHost(2032).country, "AUS");
  assertEqual(olympicHost(2036).city, "Munich");

  const cfg = getOlympicConfig(2028);
  assertEqual(cfg.fieldPerCategory, 16);
  assertEqual(cfg.perCountryLimit, 1);
  assertEqual(cfg.gRank, "G-20");
  assertEqual(cfg.gamesDate, "2028-07-30");
  assertEqual(cfg.host.country, "USA"); // venue (não sobrescrito pela regra)
  assertEqual(cfg.hostRule.quota, 2);
  assertEqual(cfg.ranking.year, 2027, "ranking usa o ano anterior");
  assertEqual(cfg.ranking.qualifiers, 5);
  assertEqual(cfg.grandSlam.year, 2027);
  assertEqual(cfg.continental.length, 5);
  const oce = cfg.continental.find((c) => c.code === "OCE");
  assertEqual(oce.quota, 1, "Oceania: 1 vaga");
});

suite("Olimpíadas — etapas de classificação (unidade)");

test("Etapa 1: top 5 do ranking, países distintos, método 'ranking'", () => {
  const { world } = buildRealWorld({ seed: 7 });
  recomputeRankings(world, "2027-12-03");
  runOlympicRankingQual(world, { olympicYear: 2028, categoryIds: MEN });
  for (const cat of MEN) {
    const q = categoryQuotas(world, 2028, cat);
    assertEqual(q.length, 5, "5 vagas por categoria");
    assert(q.every((x) => x.method === "ranking"), "método ranking");
    const countries = new Set(q.map((x) => x.countryCode));
    assertEqual(countries.size, 5, "1 por país (países distintos)");
  }
});

test("Continental exclui já classificados e países com vaga", () => {
  const { world } = buildRealWorld({ seed: 7 });
  recomputeRankings(world, "2027-12-03");
  runOlympicRankingQual(world, { olympicYear: 2028, categoryIds: MEN });
  const cat = MEN[0];
  const qualifiedCountries = new Set(categoryQuotas(world, 2028, cat).map((q) => q.countryCode));
  const qualifiedIds = new Set(categoryQuotas(world, 2028, cat).map((q) => q.athleteId));
  const field = continentalQualParticipants(
    world,
    { olympicYear: 2028, olympicContinent: "EUR" },
    cat
  );
  assert(field.length > 0, "há campo europeu");
  for (const a of field) {
    assertEqual(continentOf(world.countries[a.countryId].code), "EUR", "só europeus");
    assert(!qualifiedIds.has(a.id), "sem já classificados");
    assert(!qualifiedCountries.has(world.countries[a.countryId].code), "sem países já com vaga");
  }
  // 1 por país
  const codes = field.map((a) => world.countries[a.countryId].code);
  assertEqual(new Set(codes).size, codes.length, "1 atleta por país no campo");
});

suite("Olimpíadas — integração (3 ciclos: 2028, 2032, 2036)");

test("cada ciclo: 16/cat, 1/país, composição de vagas e campeão G-20", () => {
  const g = newGame();
  for (let y = 2026; y <= 2036; y++) g.advanceOneYear();

  for (const year of [2028, 2032, 2036]) {
    const games = Object.values(g.world.competitions).find(
      (c) => isOlympics(c) && c.date.startsWith(String(year))
    );
    assert(games && games.status === "concluida", `Jogos ${year} deveriam ter rodado`);
    assert(games.date === `${year}-07-30`, "30 de julho");
    const view = g.getCompetitionView(games.id);
    assertEqual(view.championPoints, 200, "G-20: campeão 200");
    assertEqual(view.location, olympicHost(year).city, "sede correta");

    const allowed = new Set(["ranking", "grandslam", "continental", "host", "tripartite", "replacement"]);
    let hostQuotas = 0;
    for (const cat of view.categories) {
      // Campo até 16 (uma lesão nos últimos 15 dias, sem tempo de substituição,
      // pode deixar a categoria com 15).
      assert(cat.placements.length >= 8 && cat.placements.length <= 16, `${year} ${cat.categoryName}: campo até 16`);
      const countries = new Set(cat.placements.map((p) => p.ioc));
      assertEqual(countries.size, cat.placements.length, "1 por país (países distintos)");
      const byMethod = {};
      for (const p of cat.placements) {
        const m = (p.quotaMethod || "?").split(":")[0];
        assert(allowed.has(m), `método de vaga válido: ${m}`);
        byMethod[m] = (byMethod[m] || 0) + 1;
      }
      // Composição-base 5+1+9 pode migrar para "replacement" por lesão; a sede
      // concede no máximo 2.
      hostQuotas += byMethod.host || 0;
      assertEqual(cat.placements.filter((p) => p.placement === 1).length, 1, "um campeão");
      // Repescagem: exatamente DOIS bronzes e colocações da tabela {1,2,3,5,9}.
      assertEqual(cat.placements.filter((p) => p.medal === "bronze").length, 2, "dois bronzes");
      assert(cat.placements.every((p) => [1, 2, 3, 5, 9].includes(p.placement)), "colocações {1,2,3,5,9}");
    }
    assert(hostQuotas <= 2, "país-sede: no máximo 2 vagas");

    // Campeão pontua no ranking normal (evento oficial G-20).
    const champId = view.categories[0].placements.find((p) => p.placement === 1).athleteId;
    const entry = (g.world.athletes[champId].pointsLedger || []).find((e) => e.competitionId === games.id);
    assert(entry && entry.points === 200, "campeão +200 no ledger");
  }
});

test("torneios continentais rodam e NÃO pontuam no ranking", () => {
  const g = newGame();
  for (let y = 2026; y <= 2028; y++) g.advanceOneYear();
  const conts = Object.values(g.world.competitions).filter(
    (c) => isOlympicContinentalQual(c) && c.date.startsWith("2028")
  );
  assertEqual(conts.length, 5, "5 torneios continentais em 2028");
  for (const c of conts) {
    assert(c.status === "concluida", `${c.name} deveria ter rodado`);
    // Finalistas viram vaga; ninguém ganhou pontos de ranking por este torneio.
    const champId = c.results[c.categoryIds[0]]?.find((p) => p.placement === 1)?.athleteId;
    if (champId) {
      const entry = (g.world.athletes[champId].pointsLedger || []).find((e) => e.competitionId === c.id);
      assert(!entry, "torneio continental não credita pontos no ranking");
    }
  }
});

suite("Olimpíadas — repescagem (motor de chave)");

test("repescagem: dois bronzes por chaves cruzadas; colocações {1,2,3,5,9}", () => {
  const random = new RandomSystem(3);
  const athletes = Array.from({ length: 16 }, (_, i) => ({ id: "A" + i }));
  const fightFn = (_r, a) => ({ winnerId: a.id, rounds: [] }); // 1º slot vence
  const { placements, matches } = simulateCategory(random, athletes, { preseeded: true, repechage: true, fightFn });
  assertEqual(placements.length, 16, "16 colocados");
  assertEqual(placements.filter((p) => p.placement === 1).length, 1, "um ouro");
  assertEqual(placements.filter((p) => p.placement === 2).length, 1, "uma prata");
  assertEqual(placements.filter((p) => p.medal === "bronze").length, 2, "DOIS bronzes");
  assert(placements.every((p) => [1, 2, 3, 5, 9].includes(p.placement)), "só {1,2,3,5,9}");
  assert(matches.some((m) => m.round === 103), "houve 1ª rodada de repescagem");
  assertEqual(matches.filter((m) => m.round === 3).length, 2, "duas lutas de bronze (cruzadas)");
  const seen = new Set();
  for (const p of placements) {
    assert(!seen.has(p.athleteId), "sem duplicata");
    seen.add(p.athleteId);
  }
});

suite("Olimpíadas — substituição por lesão");

test("classificado lesionado perde a vaga; substituto herda; gera notícias", () => {
  const g = newGame();
  g.advanceOneYear(); // 2026
  g.advanceOneYear(); // 2027
  g.director.advanceUntil("2028-06-20"); // após continentais, antes da confirmação (15/jul)

  const cat = "WC-M-58";
  const victim = categoryQuotas(g.world, 2028, cat).find((q) => q.method === "ranking");
  const a = g.world.athletes[victim.athleteId];
  a.status = "lesionado";
  a.condition.injuredUntil = "2028-08-20"; // volta depois dos Jogos (perde a vaga)
  g.world.injuries.push({ athleteId: a.id, until: "2028-08-20", severity: "grave" });

  g.director.advanceUntil("2028-12-31"); // roda a Confirmação (15/jul) + os Jogos

  const finalQuotas = categoryQuotas(g.world, 2028, cat);
  assertEqual(finalQuotas.length, 16, "campo continua com 16");
  assert(!finalQuotas.some((q) => q.athleteId === a.id), "o lesionado perdeu a vaga");
  const repl = finalQuotas.find((q) => q.method === "replacement");
  assert(repl, "há um substituto com método 'replacement'");

  assert(g.world.news.some((n) => n.type === "olympic-forfeit" && n.athleteId === a.id), "notícia de vaga perdida");
  assert(
    g.world.news.some((n) => n.type === "olympic-replacement" && n.athleteId === repl.athleteId),
    "notícia de vaga herdada"
  );

  // No campo dos Jogos: lesionado ausente, substituto presente.
  const games = Object.values(g.world.competitions).find((c) => isOlympics(c) && c.date.startsWith("2028"));
  const catView = g.getCompetitionView(games.id).categories.find((c) => c.categoryId === cat);
  const ids = new Set(catView.placements.map((p) => p.athleteId));
  assert(!ids.has(a.id), "lesionado fora dos Jogos");
  assert(ids.has(repl.athleteId), "substituto disputou os Jogos");
});

test("herança pela Seleção Nacional quando o titular é Top-20", () => {
  const g = newGame();
  g.advanceOneYear(); // 2026
  g.advanceOneYear(); // 2027
  g.director.advanceUntil("2028-06-20");

  const cat = "WC-M-58";
  const victim = categoryQuotas(g.world, 2028, cat).find((q) => q.method === "ranking");
  const injured = g.world.athletes[victim.athleteId];
  const code = g.world.countries[injured.countryId].code;

  // Titular Top-20 ativo do mesmo país, ainda não classificado.
  const teammate = Object.values(g.world.athletes).find(
    (x) =>
      x.weightCategoryId === cat &&
      x.status === "ativo" &&
      g.world.countries[x.countryId].code === code &&
      x.id !== injured.id &&
      (x.ranking?.position ?? 999) <= 20 &&
      !categoryQuotas(g.world, 2028, cat).some((q) => q.athleteId === x.id)
  );
  if (teammate) {
    (g.world.nationalTeams[code] ||= {})[cat] = { titulares: [teammate.id], reservas: [], year: 2028 };
    injured.status = "lesionado";
    injured.condition.injuredUntil = "2028-08-20";
    g.world.injuries.push({ athleteId: injured.id, until: "2028-08-20", severity: "grave" });

    g.director.advanceUntil("2028-12-31");

    const repl = categoryQuotas(g.world, 2028, cat).find((q) => q.method === "replacement");
    assert(repl && repl.athleteId === teammate.id, "titular Top-20 herdou a vaga");
    assert(
      g.world.news.some(
        (n) => n.type === "olympic-replacement" && n.athleteId === teammate.id && n.via === "national"
      ),
      "notícia de herança pela Seleção Nacional"
    );
  }
});
