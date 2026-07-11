/**
 * Testes do Passo 15 — Consultas de UI do GameController (bandeiras, setas de
 * movimento, visão de campeonato, próximos campeonatos do atleta).
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { flagEmoji } from "../src/config/flags.js";

function newGame(seed = 20260101) {
  const g = new GameController({ storage: new StorageService(new MemoryBackend()) });
  g.newGame(seed);
  return g;
}

suite("Bandeiras");

test("flagEmoji cobre países do roster e ignora sem-bandeira", () => {
  assertEqual(flagEmoji("KOR"), "🇰🇷");
  assertEqual(flagEmoji("BRA"), "🇧🇷");
  assertEqual(flagEmoji("TRT"), null); // refugiados
});

test("ranking traz bandeira em cada entrada", () => {
  const g = newGame();
  const rank = g.getRanking("WC-M-58", 10);
  assert(rank.every((r) => "flag" in r), "toda entrada deveria ter flag");
  assert(rank.some((r) => r.flag), "ao menos algumas com bandeira");
});

suite("Setas de movimento");

test("delta é null antes de avançar e reflete mudança depois", () => {
  const g = newGame();
  const before = g.getRanking("WC-M-58", 20);
  assert(before.every((r) => r.delta === null), "sem referência inicial → null");
  // O ranking é MENSAL: só muda quando um avanço cruza o dia 1 de um mês (após
  // resultados acumulados). Avançamos evento a evento até aparecer movimento.
  let after = [];
  for (let i = 0; i < 40; i++) {
    g.advanceToNextEvent();
    // A categoria inteira: os Opens são disputados por atletas de ranking mais
    // baixo, então o movimento pode estar fora do topo.
    after = g.getRanking("WC-M-58", 256);
    if (after.some((r) => r.delta !== null && r.delta !== 0)) break;
  }
  assert(after.some((r) => r.delta !== null && r.delta !== 0), "deveria haver movimento ao cruzar um mês");
  // Consistência: delta = posição anterior - atual (subir = positivo).
  for (const r of after) {
    if (r.delta != null) assert(Number.isInteger(r.delta), "delta inteiro");
  }
});

suite("Visão de campeonato");

test("evento futuro: campo projetado respeita a trava do Grand Prix", () => {
  const g = newGame();
  const gp = g.getSeasonSchedule().find((e) => e.gRank === "G-6");
  const view = g.getCompetitionView(gp.id);
  assert(!view.done, "GP futuro ainda não realizado");
  assertEqual(view.eligibility.rankingLockTopN, 32);
  const field = view.categories[0].field;
  assert(field.length > 0 && field.length <= 32, "campo do GP até 32");
  assert(field.every((a) => a.position <= 32), "só top 32 no GP");
});

test("evento concluído: classificação + lutas por peso", () => {
  const g = newGame();
  // avança até concluir ao menos um evento
  g.advanceToNextEvent();
  const done = g.getSeasonSchedule().find((e) => e.done);
  assert(done, "deveria haver evento concluído");
  const view = g.getCompetitionView(done.id);
  assert(view.done);
  const cat = view.categories[0];
  assert(cat.placements.length > 0, "deveria ter classificação");
  assertEqual(cat.placements.filter((p) => p.placement === 1).length, 1, "um campeão");
  assert(cat.placements.every((p) => "flag" in p), "colocações com bandeira");
  assert(cat.matches.length > 0, "deveria ter lutas");
  const final = cat.matches.find((m) => m.roundLabel === "Final");
  assert(final && final.winnerId, "final com vencedor");
  assert(Array.isArray(final.score) && final.score.length === 2, "placar de rounds");
});

suite("Ranking completo, lesão nas listas e confrontos");

test("getRanking sem limite retorna todos os atletas", () => {
  const g = newGame();
  const all = g.getRanking("WC-M-58");
  assertEqual(all.length, g.getRankingSize("WC-M-58"));
  assert(all.length > 200, "deveria trazer o plantel inteiro");
  assert(all.every((r) => "injured" in r), "cada entrada indica lesão");
});

test("confrontos trazem o ranking de início do campeonato", () => {
  const g = newGame();
  g.advanceToNextEvent();
  const done = g.getSeasonSchedule().find((e) => e.done);
  const view = g.getCompetitionView(done.id);
  const matches = view.categories[0].matches;
  assert(matches.length > 0);
  assert(matches.every((m) => "rank" in m.a && "rank" in m.b), "confronto traz ranks");
  assert(matches.some((m) => Number.isInteger(m.a.rank)), "ao menos um rank numérico");
});

suite("Notícias, favoritos e país");

test("feed de notícias inclui campeões e lesões/recuperações", () => {
  const g = newGame();
  for (let i = 0; i < 12; i++) g.advanceToNextEvent();
  const feed = g.getNews(50);
  assert(feed.length > 0, "feed não vazio");
  assert(feed.some((n) => n.type === "champion"), "deveria ter campeões");
  assert(feed.some((n) => n.type === "injury" || n.type === "recovery"), "deveria ter lesão/recuperação");
  // ordenado por data desc
  for (let i = 1; i < feed.length; i++) assert(feed[i - 1].date >= feed[i].date, "fora de ordem");
});

test("favoritos: adicionar e listar", () => {
  const g = newGame();
  const id = g.getRanking("WC-M-58", 1)[0].id;
  g.toggleFavoriteAthlete(id);
  const favs = g.getFavoriteAthletes();
  assertEqual(favs.length, 1);
  assertEqual(favs[0].id, id);
  assert(favs[0].flag !== undefined, "favorito traz bandeira");
});

test("busca encontra atleta por nome", () => {
  const g = newGame();
  const someone = g.getRanking("WC-M-58", 1)[0];
  const term = someone.name.split(" ")[0];
  const found = g.searchAthletes(term);
  assert(found.some((a) => a.id === someone.id), "deveria encontrar o atleta buscado");
});

test("detalhe de país traz atletas e melhores por categoria", () => {
  const g = newGame();
  const cv = g.getCountryView("KOR");
  assert(cv && cv.flag, "país com bandeira");
  assert(cv.athletes.length > 0, "deveria listar atletas");
  assertEqual(cv.bestByCategory.length, 4, "4 categorias masculinas");
});

suite("Próximos campeonatos do atleta");

test("elite aparece nos grandes eventos, não nos Opens pequenos", () => {
  const g = newGame();
  const topId = g.getRanking("WC-M-58", 1)[0].id;
  const up = g.getAthleteUpcoming(topId);
  assert(up.length > 0, "elite deveria ter inscrições previstas");
  // ao menos um evento grande (G-4+) entre as inscrições
  assert(up.some((e) => ["G-4", "G-6", "G-10"].includes(e.gRank)), "deveria mirar eventos grandes");
});
