/**
 * Lista virtualizada (windowing) — renderiza apenas as linhas visíveis,
 * mantendo a performance com MILHARES de itens (o ranking passou a conter todos
 * os atletas rankeados por categoria). Sem dependências.
 *
 * A interface rola a JANELA do documento (topbar sticky + nav fixo), então a
 * referência de visibilidade é o viewport (`window.innerHeight`) e a posição do
 * espaçador via `getBoundingClientRect()` — não um container com overflow.
 *
 * Estratégia: um espaçador com a altura total real (nº de itens × passo da
 * linha) preserva a rolagem; a cada rolagem (limitada por requestAnimationFrame)
 * só as linhas da janela visível — mais um respiro acima/abaixo — são recriadas,
 * posicionadas em absoluto pelo índice.
 *
 * Responsabilidade única: não sabe o que é uma "linha", recebe `renderRow`.
 */

import { el } from "./dom.js";

/**
 * @param {Array} items      dados já prontos (um por linha)
 * @param {number} rowHeight passo vertical de cada linha, em px
 * @param {(item, index) => HTMLElement} renderRow
 * @param {object} [opts] { buffer } linhas extras acima/abaixo (padrão 6)
 * @returns {{ node: HTMLElement, dispose: () => void }}
 */
export function virtualList(items, rowHeight, renderRow, opts = {}) {
  const buffer = opts.buffer ?? 6;
  const total = items.length;
  const spacer = el("div.vlist", { style: `height:${total * rowHeight}px;` });

  let start = -1;
  let end = -1;
  let raf = 0;

  function render() {
    raf = 0;
    if (!spacer.isConnected) return; // desmontado: no-op barato
    const sRect = spacer.getBoundingClientRect();
    // Quanto do topo da lista já rolou acima do topo do viewport.
    const above = -sRect.top;
    const first = Math.max(0, Math.floor(above / rowHeight) - buffer);
    const visible = Math.ceil(window.innerHeight / rowHeight) + buffer * 2;
    const last = Math.min(total, first + visible);
    if (first === start && last === end) return; // janela inalterada
    start = first;
    end = last;
    const rows = [];
    for (let i = first; i < last; i++) {
      const row = renderRow(items[i], i);
      row.classList.add("vrow");
      row.style.top = `${i * rowHeight}px`;
      rows.push(row);
    }
    spacer.replaceChildren(...rows);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  raf = requestAnimationFrame(render); // primeira pintura com layout válido

  return {
    node: spacer,
    dispose() {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
