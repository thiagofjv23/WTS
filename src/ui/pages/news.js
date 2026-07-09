/**
 * Página de Notícias/Resultados — campeões recentes.
 */

import { el, mount, fmtDate } from "../dom.js";
import { gRankBadge, sectionTitle } from "../components.js";

export function renderNews(container, game, onAthleteSearch) {
  const results = game.getRecentResults(25);
  const items = results.length
    ? results.map((r) =>
        el(
          "div.card.news-card",
          el(
            "div.news-head",
            el("span.news-date", fmtDate(r.date)),
            gRankBadge(r.gRank)
          ),
          el("div.news-title", `${r.competition}`),
          el(
            "div.news-body",
            el("span.news-cat", r.category),
            el("span.news-champ", `🥇 ${r.champion} (${r.championIoc})`)
          )
        )
      )
    : [el("p.empty", "Ainda não há resultados. Avance o tempo para simular eventos.")];

  mount(container, sectionTitle("Resultados Recentes"), el("div.list", ...items));
}
