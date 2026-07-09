/**
 * Página de Ranking — seletor de categoria + lista ranqueada.
 */

import { el, mount } from "../dom.js";
import { rankingRow, sectionTitle } from "../components.js";

export function renderRanking(container, game, onAthlete, state) {
  const categories = game.getCategories();
  state.categoryId = state.categoryId || categories[0].id;

  const tabs = el(
    "div.tabs",
    ...categories.map((c) =>
      el(
        `button.tab${c.id === state.categoryId ? ".active" : ""}`,
        {
          onClick: () => {
            state.categoryId = c.id;
            renderRanking(container, game, onAthlete, state);
          },
        },
        c.name
      )
    )
  );

  const list = game.getRanking(state.categoryId, 60);
  const rows = list.length
    ? list.map((e) => rankingRow(e, onAthlete))
    : [el("p.empty", "Sem atletas ranqueados ainda.")];

  mount(
    container,
    sectionTitle("Ranking Mundial"),
    tabs,
    el("div.list", ...rows)
  );
}
