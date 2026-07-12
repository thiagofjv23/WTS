/**
 * Página de Calendário — agenda completa do ano (todos os eventos), agrupada
 * por mês, com status (realizado/agendado) e navegação entre anos.
 */

import { el, mount, fmtDate } from "../dom.js";
import { gRankBadge, sectionTitle } from "../components.js";
import { yearOf } from "../../utils/dates.js";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthOf(iso) {
  return Number(iso.slice(5, 7)) - 1;
}

export function renderCalendar(container, game, state, onOpen) {
  const years = game.getScheduledYears();
  const current = yearOf(game.getState().currentDate);
  if (!state.year || !years.includes(state.year)) state.year = years.includes(current) ? current : years[0];

  const schedule = game.getSeasonSchedule(state.year);

  // Navegação de ano.
  const idx = years.indexOf(state.year);
  const nav = el(
    "div.year-nav",
    el("button.year-btn", { disabled: idx <= 0, onClick: () => { state.year = years[idx - 1]; renderCalendar(container, game, state, onOpen); } }, "‹"),
    el("span.year-label", String(state.year)),
    el("button.year-btn", { disabled: idx >= years.length - 1, onClick: () => { state.year = years[idx + 1]; renderCalendar(container, game, state, onOpen); } }, "›")
  );

  const done = schedule.filter((e) => e.done).length;
  const summary = el("div.cal-summary", `${schedule.length} eventos · ${done} realizados · ${schedule.length - done} a disputar`);

  // Agrupa por mês.
  const groups = [];
  let lastMonth = -1;
  for (const e of schedule) {
    const m = monthOf(e.date);
    if (m !== lastMonth) {
      groups.push(el("h3.month-header", MONTHS[m]));
      lastMonth = m;
    }
    groups.push(eventCard(e, onOpen));
  }

  mount(
    container,
    sectionTitle("Calendário", nav),
    summary,
    schedule.length ? el("div.list", ...groups) : el("p.empty", "Nenhum evento neste ano.")
  );
}

function eventCard(e, onOpen) {
  return el(
    `button.card.event-card${e.done ? ".done" : ""}`,
    { onClick: () => onOpen && onOpen(e.id) },
    el(
      "div.event-head",
      el("span.event-date", el("span.status-dot", e.done ? "✓" : "•"), " ", fmtDate(e.date)),
      gRankBadge(e.gRank)
    ),
    el("div.event-name", e.name),
    el(
      "div.event-meta",
      e.location ? el("span", e.location) : el("span", ""),
      el("span.event-pts", e.done ? "ver resultados ›" : `campeão +${e.championPoints}`)
    )
  );
}
