/**
 * Modal de Campeonato — antes: prováveis inscritos por peso; depois: resultados
 * das lutas e classificação final por peso. Categorias em abas.
 */

import { el, fmtDate } from "../dom.js";
import { gRankBadge, medalIcon } from "../components.js";

/** Traços de elegibilidade (travas) em chips legíveis. */
function eligibilityTags(e) {
  const tags = [];
  if (e.rankingLockTopN) tags.push(`Convite: top ${e.rankingLockTopN} do ranking`);
  if (e.continent) tags.push(`Só ${continentName(e.continent)}`);
  if (e.nationalLimit) tags.push(`${e.nationalLimit} por país`);
  if (e.arabOnly) tags.push("Só países árabes");
  return tags;
}
function continentName(c) {
  return { EUR: "Europa", ASI: "Ásia", PAM: "Pan-América", AFR: "África", OCE: "Oceania" }[c] || c;
}

export function competitionModal(view, { onClose, onAthlete, state }) {
  state.catIndex = state.catIndex || 0;
  if (state.catIndex >= view.categories.length) state.catIndex = 0;

  const tabs = el(
    "div.tabs",
    ...view.categories.map((c, i) =>
      el(
        `button.tab${i === state.catIndex ? ".active" : ""}`,
        { onClick: () => { state.catIndex = i; rerender(); } },
        c.categoryName
      )
    )
  );

  const body = el("div.comp-body");
  const content = el(
    "div.modal-content",
    el(
      "div.modal-head",
      el("div.modal-title",
        el("h3", view.name),
        el("div.modal-sub", `${fmtDate(view.date)}`, gRankBadge(view.gRank), view.location ? el("span", view.location) : null)
      ),
      el("div.modal-actions", el("button.icon-btn", { onClick: onClose }, "✕"))
    ),
    (() => {
      const tags = eligibilityTags(view.eligibility);
      return tags.length ? el("div.form-row", ...tags.map((t) => el("span.tag", t))) : null;
    })(),
    el("div.comp-status", view.done ? "Resultados" : "Prováveis inscritos"),
    tabs,
    body
  );

  function rerender() {
    // atualiza abas
    [...tabs.children].forEach((btn, i) => btn.classList.toggle("active", i === state.catIndex));
    renderCategory();
  }

  function renderCategory() {
    const cat = view.categories[state.catIndex];
    body.replaceChildren(view.done ? doneCategory(cat) : upcomingCategory(cat));
  }

  function upcomingCategory(cat) {
    if (!cat.field || cat.field.length === 0) return el("p.empty", "Sem inscritos previstos.");
    return el(
      "div.list.compact",
      ...cat.field.map((a) =>
        el("button.row.entry-row", { onClick: () => onAthlete(a.id) },
          el("span.pos", `${a.seed}`),
          el("span.flag", a.flag || "🏳"),
          el("span.row-main", el("span.row-name", a.name),
            el("span.row-sub", a.position ? `ranking #${a.position}` : "sem ranking")),
          el("span.pts", `${a.points}`)
        )
      )
    );
  }

  function doneCategory(cat) {
    const podium = el(
      "div.list.compact",
      ...cat.placements.slice(0, 8).map((p) =>
        el("button.row.entry-row", { onClick: () => onAthlete(p.athleteId) },
          el("span.pos", `${p.placement}º`),
          el("span.flag", p.flag || "🏳"),
          el("span.row-main", el("span.row-name", `${medalIcon(p.medal)} ${p.name}`)),
          el("span.pts", p.points ? `+${p.points}` : "")
        )
      )
    );
    // Lutas agrupadas por rodada (Final primeiro).
    const byRound = new Map();
    for (const m of cat.matches) {
      if (!byRound.has(m.roundLabel)) byRound.set(m.roundLabel, []);
      byRound.get(m.roundLabel).push(m);
    }
    const order = ["Final", "Semifinal", "Quartas de final", "Oitavas de final"];
    const roundNames = [...byRound.keys()].sort(
      (a, b) => (order.indexOf(a) + 99 * (order.indexOf(a) < 0)) - (order.indexOf(b) + 99 * (order.indexOf(b) < 0))
    );
    const fights = roundNames.map((rn) =>
      el("div.round-block",
        el("h4.round-title", rn),
        ...byRound.get(rn).map((m) => matchRow(m))
      )
    );
    return el("div",
      el("h4.block-title", "Classificação final"),
      podium,
      el("h4.block-title", "Resultados das lutas"),
      ...fights
    );
  }

  function matchRow(m) {
    const aWon = m.winnerId === m.a.id;
    const rank = (r) => el("span.match-rank", r != null ? `#${r}` : "—");
    return el("div.match-row",
      el(`span.match-side${aWon ? ".win" : ""}`,
        el("span.flag", m.a.flag || "🏳"), " ", rank(m.a.rank), " ", el("span.match-name", m.a.name)),
      el("span.match-score", `${m.score[0]}–${m.score[1]}`),
      el(`span.match-side.right${!aWon ? ".win" : ""}`,
        el("span.match-name", m.b.name), " ", rank(m.b.rank), " ", el("span.flag", m.b.flag || "🏳"))
    );
  }

  renderCategory();
  const overlay = el("div.modal-overlay", { onClick: (e) => { if (e.target === overlay) onClose(); } }, content);
  return overlay;
}
