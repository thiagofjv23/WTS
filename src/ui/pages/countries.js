/**
 * Página de Países — quadro por pontos de ranking e medalhas.
 */

import { el, mount } from "../dom.js";
import { sectionTitle } from "../components.js";

export function renderCountries(container, game) {
  const table = game.getCountryTable(40);
  const rows = table.map((c, i) =>
    el(
      "div.row.country-row",
      el("span.pos", `${i + 1}`),
      el("span.flag.flag-lg", c.flag || "🏳"),
      el(
        "span.row-main",
        el("span.row-name", c.code),
        el("span.row-sub", `${c.name} · ${c.athletes} atletas`)
      ),
      el("span.medals", `🥇${c.golds} 🥈${c.silvers} 🥉${c.bronzes}`),
      el("span.pts", `${c.points.toFixed(0)}`)
    )
  );
  mount(
    container,
    sectionTitle("Países"),
    rows.length ? el("div.list", ...rows) : el("p.empty", "Sem dados.")
  );
}
