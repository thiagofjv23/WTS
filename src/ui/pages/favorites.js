/**
 * Página de Favoritos + Busca.
 * Lista os atletas favoritados e permite buscar qualquer atleta por nome.
 */

import { el, mount } from "../dom.js";
import { sectionTitle, injuryMark } from "../components.js";

function athleteRow(a, onAthlete) {
  return el(
    "button.row.rank-row",
    { onClick: () => onAthlete(a.id) },
    el("span.flag.flag-lg", a.flag || "🏳"),
    el(
      "span.row-main",
      el("span.row-name", a.name, a.injured ? injuryMark() : null),
      el("span.row-sub", `${a.category} · ${a.position ? "#" + a.position : "—"}`)
    ),
    el("span.pts", `${a.points}`)
  );
}

export function renderFavorites(container, game, onAthlete, state) {
  state.query = state.query || "";

  const results = el("div.search-results");
  function renderResults() {
    const q = state.query.trim();
    if (!q) {
      results.replaceChildren();
      return;
    }
    const found = game.searchAthletes(q);
    results.replaceChildren(
      el("h4.block-title", "Resultados da busca"),
      found.length
        ? el("div.list.compact", ...found.map((a) => athleteRow(a, onAthlete)))
        : el("p.empty", "Nenhum atleta encontrado.")
    );
  }

  const input = el("input.search-input", {
    type: "search",
    placeholder: "Buscar atleta pelo nome…",
    value: state.query,
    oninput: (e) => {
      state.query = e.target.value;
      renderResults();
    },
  });

  const favs = game.getFavoriteAthletes();
  mount(
    container,
    sectionTitle("Favoritos"),
    input,
    el("h4.block-title", `Meus favoritos (${favs.length})`),
    favs.length
      ? el("div.list.compact", ...favs.map((a) => athleteRow(a, onAthlete)))
      : el("p.empty", "Nenhum favorito ainda. Abra um atleta e toque na estrela ☆."),
    results
  );
  renderResults();
}
