/**
 * Modal de País — bandeira, continente, medalhas e atletas do país.
 */

import { el } from "../dom.js";
import { injuryMark, nationalTeamMark } from "../components.js";

const CONTINENTS = { EUR: "Europa", ASI: "Ásia", PAM: "Pan-América", AFR: "África", OCE: "Oceania" };

export function countryModal(view, { onClose, onAthlete }) {
  const s = view.statistics;

  const best = el(
    "div.list.compact",
    ...view.bestByCategory.map((b) =>
      b.athlete
        ? el("button.row.entry-row", { onClick: () => onAthlete(b.athlete.id) },
            el("span.cat-tag", b.category),
            el("span.row-main", el("span.row-name", b.athlete.name,
              b.athlete.nationalTeam ? nationalTeamMark(b.athlete.nationalTeam) : null),
              el("span.row-sub", b.athlete.position ? `#${b.athlete.position} do mundo` : "sem ranking")),
            el("span.pts", `${b.athlete.points}`))
        : el("div.row", el("span.cat-tag", b.category), el("span.row-main", el("span.row-sub", "—")))
    )
  );

  const athletes = el(
    "div.list.compact",
    ...view.athletes.slice(0, 40).map((a) =>
      el("button.row.entry-row", { onClick: () => onAthlete(a.id) },
        el("span.row-main", el("span.row-name", a.name,
          a.nationalTeam ? nationalTeamMark(a.nationalTeam) : null,
          a.injured ? injuryMark() : null),
          el("span.row-sub", `${a.category} · ${a.position ? "#" + a.position : "—"}`)),
        el("span.pts", `${a.points}`))
    )
  );

  const content = el(
    "div.modal-content",
    el("div.modal-head",
      el("div.modal-title",
        el("h3", el("span.flag.flag-lg", view.flag || "🏳"), " ", view.name),
        el("div.modal-sub", `${view.code}`, view.continent ? el("span", CONTINENTS[view.continent]) : null, `${view.athleteCount} atletas`)
      ),
      el("div.modal-actions", el("button.icon-btn", { onClick: onClose }, "✕"))
    ),
    el("div.stat-grid",
      statBox("🥇", s.golds), statBox("🥈", s.silvers), statBox("🥉", s.bronzes),
      statBox("Pontos", Math.round(s.rankingPoints)), statBox("Atletas", view.athleteCount), statBox("Continente", view.continent || "—")
    ),
    el("h4.block-title", "Melhor por categoria"),
    best,
    el("h4.block-title", "Atletas"),
    athletes
  );

  const overlay = el("div.modal-overlay", { onClick: (e) => { if (e.target === overlay) onClose(); } }, content);
  return overlay;
}

function statBox(label, value) {
  return el("div.stat-box", el("span.stat-val", String(value)), el("span.stat-label", label));
}
