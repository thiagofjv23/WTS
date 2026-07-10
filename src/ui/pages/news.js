/**
 * Página de Notícias/Resultados — campeões recentes.
 */

import { el, mount, fmtDate } from "../dom.js";
import { gRankBadge, sectionTitle } from "../components.js";

export function renderNews(container, game, onOpen) {
  const results = game.getRecentResults(25);
  const items = results.length
    ? results.map((r) =>
        el(
          "button.card.news-card",
          { onClick: () => onOpen && r.competitionId && onOpen(r.competitionId) },
          el(
            "div.news-head",
            el("span.news-date", fmtDate(r.date)),
            gRankBadge(r.gRank)
          ),
          el("div.news-title", `${r.competition}`),
          el(
            "div.news-body",
            el("span.news-cat", r.category),
            el("span.news-champ", `🥇 ${r.championFlag || ""} ${r.champion}`)
          )
        )
      )
    : [el("p.empty", "Ainda não há resultados. Avance o tempo para simular eventos.")];

  mount(container, sectionTitle("Resultados Recentes"), el("div.list", ...items));
}
