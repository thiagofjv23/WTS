/**
 * Avanço mensal/anual e a tela de fim de ano (ranking de janeiro + variação).
 */

import { suite, test, assert, assertEqual } from "./harness.mjs";
import { GameController } from "../src/app/gameController.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";
import { addMonths, addYears, yearOf } from "../src/utils/dates.js";
import { effectivePoints } from "../src/engine/ranking.js";

function game(seed = 20260101) {
  const g = new GameController({ storage: new StorageService(new MemoryBackend()) });
  g.newGame(seed);
  return g;
}

suite("Datas — addMonths/addYears");

test("addMonths avança e ajusta o fim do mês", () => {
  assertEqual(addMonths("2026-03-15", 1), "2026-04-15");
  assertEqual(addMonths("2026-01-31", 1), "2026-02-28"); // clamp p/ fim de fevereiro
  assertEqual(addMonths("2026-12-10", 1), "2027-01-10"); // vira o ano
});

test("addYears avança anos", () => {
  assertEqual(addYears("2026-06-01", 1), "2027-06-01");
});

suite("Avanço mensal e anual");

test("avanço mensal processa ~1 mês", () => {
  const g = game();
  const start = g.getState().currentDate; // 2026-01-01
  const res = g.advanceOneMonth();
  assert(res.date > start, "a data deveria avançar");
  assert(res.date.startsWith("2026-02"), `esperado fevereiro, veio ${res.date}`);
  assert(!res.yearEnd, "não cruzou ano → sem tela de fim de ano");
});

test("avanço anual roda o ano inteiro sem perder eventos e mostra fim de ano", () => {
  const g = game();
  const res = g.advanceOneYear();
  assert(res.date.startsWith("2027-01"), `esperado jan/2027, veio ${res.date}`);
  assert(g.world.history.length > 0, "os eventos de 2026 deveriam ter rodado");
  assert(res.yearEnd, "deveria haver resumo de fim de ano");
  assertEqual(res.yearEnd.year, 2027);
  assertEqual(res.yearEnd.previousYear, 2026);
  assertEqual(res.yearEnd.categories.length, 4);
});

test("o fim de ano compara jan do novo ano com jan do anterior", () => {
  const g = game();
  const res = g.advanceOneYear();
  for (const cat of res.yearEnd.categories) {
    // posições sequenciais 1..N
    cat.rows.forEach((r, i) => assertEqual(r.position, i + 1));
    for (const r of cat.rows) if (r.delta != null) assert(Number.isInteger(r.delta), "delta inteiro");
  }
  const moved = res.yearEnd.categories.some((c) => c.rows.some((r) => r.delta !== null && r.delta !== 0));
  assert(moved, "deveria haver variação de posições ao longo do ano");
});

test("avanço anual a partir do meio do ano também gera fim de ano", () => {
  const g = game();
  g.advanceToNextEvent(); // entra em algum ponto de 2026
  const res = g.advanceOneYear(); // cruza jan/2027
  assert(res.yearEnd && res.yearEnd.year === 2027, "cruzar janeiro deveria gerar a tela");
});

test("os botões anteriores seguem retornando resultados e detectam a virada", () => {
  const g = game();
  const day = g.advanceOneDay();
  assert("results" in day && "yearEnd" in day, "advanceOneDay mantém results e ganha yearEnd");
  assert(day.yearEnd === null, "1 dia em jan não cruza ano");
});

test("determinismo do avanço anual", () => {
  const a = game(7).advanceOneYear();
  const b = game(7).advanceOneYear();
  assertEqual(JSON.stringify(a.yearEnd), JSON.stringify(b.yearEnd));
});

suite("Passagem de ano — consistência de datas/nomes/histórico");

test("cada edição fica no seu ano; nome, data e histórico batem", () => {
  const g = game();
  g.advanceOneYear(); // roda 2026, agenda 2027

  const comps = Object.values(g.world.competitions);
  const byYear = { 2026: 0, 2027: 0 };
  for (const c of comps) {
    const y = yearOf(c.date);
    byYear[y] = (byYear[y] || 0) + 1;
    // o ano embutido no nome (se houver) tem de bater com o ano da data
    const other = y === 2026 ? "2027" : "2026";
    assert(!c.name.includes(other), `"${c.name}" (${c.date}) cita o ano errado`);
  }
  assert(byYear[2026] > 0 && byYear[2027] > 0, "deve haver edições de 2026 e 2027");

  // 2026 concluídas; 2027 agendadas (futuras)
  const done2026 = comps.filter((c) => yearOf(c.date) === 2026 && c.status === "concluida").length;
  const sched2027 = comps.filter((c) => yearOf(c.date) === 2027 && c.status !== "concluida").length;
  assertEqual(done2026, byYear[2026], "todas as de 2026 deveriam estar concluídas");
  assertEqual(sched2027, byYear[2027], "todas as de 2027 deveriam estar agendadas");

  // Histórico dos atletas: a data da entrada = a data real da competição.
  let checked = 0;
  for (const a of Object.values(g.world.athletes)) {
    for (const h of a.history || []) {
      const c = g.world.competitions[h.competitionId];
      assertEqual(h.date, c.date, "data do histórico deveria bater com a da competição");
      assert(h.date.startsWith("2026"), "em 2027, o histórico disputado é de 2026");
      checked++;
    }
  }
  assert(checked > 0, "deveria haver histórico para conferir");
});

test("o decaimento usa a data (não o nome): resultado de 2026 cai em 2027→2028", () => {
  const g = game();
  g.advanceOneYear(); // 2026 rodado
  const ath = Object.values(g.world.athletes).find((a) => (a.pointsLedger || []).some((e) => e.gRank !== "seed"));
  const entry = ath.pointsLedger.find((e) => e.gRank !== "seed" && e.date.startsWith("2026"));
  assert(entry, "deveria haver um resultado de 2026 no ledger");
  // A data do resultado é 2026 — o decaimento independe do nome do evento.
  const pAt2026 = effectivePoints(ath, "2026-07-01");
  const pAt2028 = effectivePoints(ath, "2028-07-01");
  assert(pAt2028 < pAt2026, "os pontos de 2026 deveriam ter decaído dois anos depois");
});
