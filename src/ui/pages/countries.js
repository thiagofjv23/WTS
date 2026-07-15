/**
 * Página de Países — quadro por pontos de ranking e medalhas.
 */

import { el, mount } from "../dom.js";
import { sectionTitle } from "../components.js";

export function renderCountries(container, game, onCountry) {
  const table = game.getCountryTable(); // todos os países da database
  const rows = table.map((c, i) =>
    el(
      "button.row.country-row",
      { onClick: () => onCountry && onCountry(c.code) },
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
