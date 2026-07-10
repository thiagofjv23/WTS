/**
 * Página de Notícias/Resultados — feed com campeões, lesões e recuperações.
 */

import { el, mount, fmtDate } from "../dom.js";
import { gRankBadge, sectionTitle } from "../components.js";

const SEVERITY = { leve: "lesão leve", moderada: "lesão moderada", grave: "lesão grave (cirurgia)" };

export function renderNews(container, game, onOpen, onAthlete) {
  const feed = game.getNews(40);
  const items = feed.length ? feed.map((n) => card(n, onOpen, onAthlete)) : [
    el("p.empty", "Ainda não há notícias. Avance o tempo para simular eventos."),
  ];
  mount(container, sectionTitle("Notícias"), el("div.list", ...items));
}

function card(n, onOpen, onAthlete) {
  if (n.type === "champion") {
    return el(
      "button.card.news-card",
      { onClick: () => onOpen && n.competitionId && onOpen(n.competitionId) },
      el("div.news-head", el("span.news-date", fmtDate(n.date)), gRankBadge(n.gRank)),
      el("div.news-title", n.competition),
      el("div.news-body",
        el("span.news-cat", n.category),
        el("span.news-champ", `🥇 ${n.flag || ""} ${n.name}`))
    );
  }
  // lesão / recuperação
  const injury = n.type === "injury";
  return el(
    "button.card.news-card.news-med",
    { onClick: () => onAthlete && n.athleteId && onAthlete(n.athleteId) },
    el("div.news-head",
      el("span.news-date", fmtDate(n.date)),
      el(`span.badge.${injury ? "g-open" : "g-mid"}`, injury ? "LESÃO" : "RETORNO")
    ),
    el("div.news-title", `${injury ? "✚" : "✔"} ${n.flag || ""} ${n.name}`),
    el("div.news-body",
      el("span.news-cat", n.category || ""),
      el("span.news-champ",
        injury
          ? `${SEVERITY[n.severity] || "lesão"} · volta ${n.until ? fmtDate(n.until) : "?"}`
          : "recuperado e de volta ao circuito"))
  );
}
