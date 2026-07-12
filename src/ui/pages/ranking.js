/**
 * Página de Ranking — seletor de categoria + lista ranqueada (virtualizada).
 *
 * A lista pode ter MILHARES de linhas (todos os atletas rankeados por
 * categoria), então usamos `virtualList` para renderizar só o que está visível.
 */

import { el, mount } from "../dom.js";
import { rankingRow, sectionTitle } from "../components.js";
import { virtualList } from "../virtualList.js";

// Passo vertical de cada linha do ranking, em px (deve casar com a altura de
// .vrow.rank-row no CSS). Linha (64) + respiro (8).
const ROW_STRIDE = 72;

export function renderRanking(container, game, onAthlete, state) {
  // Encerra a virtualização anterior (troca de categoria reusa o mesmo .content).
  if (state._disposeVList) {
    state._disposeVList();
    state._disposeVList = null;
  }

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

  const list = game.getRanking(state.categoryId); // todos os atletas ranqueados

  let listNode;
  if (list.length) {
    const vlist = virtualList(list, ROW_STRIDE, (entry) => rankingRow(entry, onAthlete));
    state._disposeVList = vlist.dispose;
    listNode = vlist.node;
  } else {
    listNode = el("p.empty", "Sem atletas ranqueados ainda.");
  }

  mount(
    container,
    sectionTitle("Ranking Mundial", el("span.count-badge", `${list.length}`)),
    tabs,
    listNode
  );
}
