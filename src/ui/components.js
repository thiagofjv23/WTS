/**
 * Componentes de UI reutilizáveis (cards, chips, badges).
 * Apenas apresentação; recebem dados prontos do GameController.
 */

import { el } from "./dom.js";

/** Cor por família de G-Rank (para o badge). */
function gRankClass(gRank) {
  const n = Number((gRank || "").replace("G-", "")) || 1;
  if (n >= 10) return "g-elite";
  if (n >= 6) return "g-major";
  if (n >= 4) return "g-champ";
  if (n >= 2) return "g-mid";
  return "g-open";
}

export function gRankBadge(gRank) {
  return el(`span.badge.${gRankClass(gRank)}`, gRank);
}

/** Chip de país: bandeira (se houver) + código IOC. */
export function countryChip(ioc, flag) {
  return el("span.chip", flag ? el("span.flag", flag) : null, ioc || "??");
}

/**
 * Indicador de movimento no ranking: seta verde (subiu) / vermelha (desceu)
 * com o nº de posições, ou "—" quando estável, ou "novo".
 */
export function rankMovement(delta) {
  if (delta == null) return el("span.move.move-new", "novo");
  if (delta > 0) return el("span.move.move-up", `▲${delta}`);
  if (delta < 0) return el("span.move.move-down", `▼${-delta}`);
  return el("span.move.move-flat", "—");
}

export function medalIcon(medal) {
  if (medal === "ouro") return "🥇";
  if (medal === "prata") return "🥈";
  if (medal === "bronze") return "🥉";
  return "";
}

/** Título de seção com opcional lado direito. */
export function sectionTitle(text, right) {
  return el("div.section-title", el("h2", text), right || null);
}

/** Barra de atributo 0–100. */
export function attrBar(label, value) {
  return el(
    "div.attr",
    el("span.attr-label", label),
    el("div.attr-track", el("div.attr-fill", { style: `width:${value}%` })),
    el("span.attr-val", String(value))
  );
}

/** Selo de lesionado (cruz vermelha). */
export function injuryMark() {
  return el("span.injury-mark", { title: "Lesionado" }, "✚");
}

/**
 * Selo de Seleção Nacional. role: "titular" (destaque cheio) ou "reserva"
 * (contorno). Marca o atleta em todas as telas onde ele aparece.
 */
export function nationalTeamMark(role) {
  if (!role) return null;
  const reserve = role === "reserva";
  return el(
    `span.nt-badge${reserve ? ".reserve" : ""}`,
    { title: reserve ? "Reserva da Seleção Nacional" : "Seleção Nacional" },
    "SN"
  );
}

/** Linha de ranking (usada na página de Ranking). */
export function rankingRow(entry, onClick) {
  return el(
    "button.row.rank-row",
    { onClick: () => onClick(entry.id) },
    el("span.pos", `${entry.position}`),
    rankMovement(entry.delta),
    el("span.flag.flag-lg", entry.flag || "🏳"),
    el(
      "span.row-main",
      el(
        "span.row-name",
        entry.favorite ? "★ " : null,
        entry.name,
        entry.nationalTeam ? nationalTeamMark(entry.nationalTeam) : null,
        entry.injured ? injuryMark() : null
      ),
      el("span.row-sub", entry.countryName)
    ),
    el("span.pts", `${entry.points}`)
  );
}
