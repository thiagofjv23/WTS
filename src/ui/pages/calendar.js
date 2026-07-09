/**
 * Página de Calendário — próximos eventos agendados.
 */

import { el, mount, fmtDate } from "../dom.js";
import { gRankBadge, sectionTitle } from "../components.js";

export function renderCalendar(container, game) {
  const events = game.getUpcomingEvents(30);
  const cards = events.length
    ? events.map((e) =>
        el(
          "div.card.event-card",
          el(
            "div.event-head",
            el("span.event-date", fmtDate(e.date)),
            gRankBadge(e.gRank)
          ),
          el("div.event-name", e.name),
          el(
            "div.event-meta",
            e.location ? el("span", e.location) : null,
            el("span.event-pts", `campeão +${e.championPoints}`)
          )
        )
      )
    : [el("p.empty", "Nenhum evento agendado.")];

  mount(container, sectionTitle("Próximos Eventos"), el("div.list", ...cards));
}
