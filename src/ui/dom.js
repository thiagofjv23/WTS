/**
 * Helpers de DOM (Vanilla JS). Criam elementos com segurança (sem innerHTML),
 * mantendo a interface componentizável e sem lógica de simulação.
 */

/**
 * Cria um elemento.
 * @param {string} tag  ex.: "div", "button.primary", "span#id"
 * @param {object|Array|string|Node} [propsOrChildren]
 * @param {...(string|Node)} children
 */
export function el(tag, propsOrChildren, ...children) {
  let sel = tag;
  let props = {};
  if (
    propsOrChildren &&
    typeof propsOrChildren === "object" &&
    !(propsOrChildren instanceof Node) &&
    !Array.isArray(propsOrChildren)
  ) {
    props = propsOrChildren;
  } else if (propsOrChildren !== undefined) {
    children = [propsOrChildren, ...children];
  }

  // parse tag#id.classe.classe
  const idMatch = sel.match(/#([\w-]+)/);
  const classes = [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  const name = sel.replace(/[#.].*/g, "") || "div";
  const node = document.createElement(name);
  if (idMatch) node.id = idMatch[1];
  if (classes.length) node.className = classes.join(" ");

  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = [node.className, v].filter(Boolean).join(" ");
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "text") node.textContent = v;
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? "" : v);
  }

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Limpa e substitui o conteúdo de um container. */
export function mount(container, ...nodes) {
  container.replaceChildren(...nodes.flat().filter(Boolean));
}

/** Formata data ISO em pt-BR curto (dd/mm/aaaa). */
export function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
