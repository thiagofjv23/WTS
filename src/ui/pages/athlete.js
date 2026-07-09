/**
 * Modal de Atleta — detalhes, atributos visíveis, estatísticas e histórico.
 */

import { el, fmtDate } from "../dom.js";
import { attrBar, countryChip, medalIcon } from "../components.js";
import { TECHNICAL, PHYSICAL, MENTAL } from "../../config/attributes.js";

const LABELS = {
  ataque: "Ataque", defesa: "Defesa", contraAtaque: "Contra-ataque",
  precisao: "Precisão", velocidade: "Velocidade", controleDistancia: "Controle de Distância",
  explosao: "Explosão", resistencia: "Resistência", recuperacao: "Recuperação", equilibrio: "Equilíbrio",
  inteligenciaTatica: "Inteligência Tática", leituraLuta: "Leitura de Luta",
  disciplina: "Disciplina", sangueFrio: "Sangue Frio", adaptabilidade: "Adaptabilidade",
};

function attrGroup(title, keys, attrs) {
  return el(
    "div.attr-group",
    el("h4", title),
    ...keys.map((k) => attrBar(LABELS[k] || k, attrs[k] ?? 0))
  );
}

/** Cria o modal do atleta. onFavorite recebe o id e retorna o novo estado. */
export function athleteModal(view, { onClose, onToggleFavorite }) {
  const favBtn = el(
    `button.icon-btn${view.favorite ? ".active" : ""}`,
    { onClick: () => { const now = onToggleFavorite(view.id); favBtn.classList.toggle("active", now); favBtn.textContent = now ? "★" : "☆"; } },
    view.favorite ? "★" : "☆"
  );

  const st = view.statistics;
  const stats = el(
    "div.stat-grid",
    statBox("Ranking", view.position ? `#${view.position}` : "—"),
    statBox("Pontos", view.points),
    statBox("Idade", view.age),
    statBox("Lutas", st.fights),
    statBox("Vitórias", st.wins),
    statBox("Derrotas", st.losses),
    statBox("🥇", st.golds),
    statBox("🥈", st.silvers),
    statBox("🥉", st.bronzes)
  );

  const history = view.history.length
    ? el(
        "div.list.compact",
        ...view.history.map((h) =>
          el(
            "div.row.hist-row",
            el("span.hist-date", fmtDate(h.date)),
            el("span.row-main", el("span.row-name", `${medalIcon(h.medal)} ${h.competition}`),
              el("span.row-sub", `${h.placement}º lugar`)),
            el("span.pts", `+${h.points}`)
          )
        )
      )
    : el("p.empty", "Sem histórico ainda.");

  const content = el(
    "div.modal-content",
    el(
      "div.modal-head",
      el("div.modal-title",
        el("h3", view.name),
        el("div.modal-sub", `${view.category} · ${view.countryName}`, countryChip(view.ioc))
      ),
      el("div.modal-actions", favBtn, el("button.icon-btn", { onClick: onClose }, "✕"))
    ),
    el("div.form-row",
      el("span.tag", `Forma ${view.form}`),
      el("span.tag", `Moral ${view.morale}`),
      el("span.tag", `Exp ${view.experience}`),
      el("span.tag", view.status)
    ),
    stats,
    el("h4.block-title", "Atributos"),
    attrGroup("Técnicos", TECHNICAL, view.attributes),
    attrGroup("Físicos", PHYSICAL, view.attributes),
    attrGroup("Mentais", MENTAL, view.attributes),
    el("h4.block-title", "Histórico"),
    history
  );

  const overlay = el("div.modal-overlay", { onClick: (e) => { if (e.target === overlay) onClose(); } }, content);
  return overlay;
}

function statBox(label, value) {
  return el("div.stat-box", el("span.stat-val", String(value)), el("span.stat-label", label));
}
