/**
 * App — máquina de estados e casca da interface (mobile-first).
 *
 * Estados: MENU → SIMULATION. A interface só exibe e emite comandos ao
 * GameController; nunca contém lógica de simulação (DiretrizdeArquitetura).
 * Comunicação de atualização via re-render após comandos.
 */

import { el, mount, fmtDate } from "./dom.js";
import { rankMovement } from "./components.js";
import { renderRanking } from "./pages/ranking.js";
import { renderCalendar } from "./pages/calendar.js";
import { renderCountries } from "./pages/countries.js";
import { renderNews } from "./pages/news.js";
import { renderFavorites } from "./pages/favorites.js";
import { athleteModal } from "./pages/athlete.js";
import { competitionModal } from "./pages/competition.js";
import { countryModal } from "./pages/country.js";

const PAGES = [
  { id: "ranking", label: "Ranking", icon: "🏆" },
  { id: "calendar", label: "Calendário", icon: "📅" },
  { id: "news", label: "Notícias", icon: "📰" },
  { id: "countries", label: "Países", icon: "🌍" },
  { id: "favorites", label: "Favoritos", icon: "⭐" },
];

export class App {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.state = "MENU";
    this.page = "ranking";
    this.pageState = {}; // estado por página (ex.: categoria selecionada)
  }

  start() {
    this.renderMenu();
  }

  // ---- MENU ----------------------------------------------------------------
  renderMenu() {
    this.state = "MENU";
    const hasSave = this.game.hasSave();
    mount(
      this.root,
      el(
        "div.screen.menu",
        el("div.brand", el("div.logo", "🥋"), el("h1", "World Taekwondo"), el("p.tagline", "Simulador de Ecossistema Mundial")),
        el(
          "div.menu-actions",
          hasSave
            ? el("button.primary.big", { onClick: () => this.continueGame() }, "Continuar")
            : null,
          el("button.big", { onClick: () => this.newGame() }, hasSave ? "Novo Mundo" : "Iniciar"),
        ),
        el("p.hint", "Dados reais do ranking olímpico e do calendário oficial WT 2026.")
      )
    );
  }

  newGame() {
    this.withLoading("Gerando o mundo…", () => {
      this.game.newGame();
      this.enterSimulation();
    });
  }

  continueGame() {
    this.withLoading("Carregando…", () => {
      this.game.loadGame();
      this.enterSimulation();
    });
  }

  // ---- SIMULATION ----------------------------------------------------------
  enterSimulation() {
    this.state = "SIMULATION";
    this.renderShell();
  }

  renderShell() {
    const content = el("main.content#content");
    this.contentEl = content;
    mount(this.root, this.topBar(), content, this.bottomNav());
    this.renderPage();
  }

  topBar() {
    const s = this.game.getState();
    return el(
      "header.topbar",
      el("div.topbar-date",
        el("span.date-main", fmtDate(s.currentDate)),
        el("span.date-sub", `Temporada ${s.season}`)
      ),
      el(
        "div.topbar-actions",
        el("button.time-btn", { onClick: () => this.advance("day"), title: "Avançar 1 dia" }, "+1d"),
        el("button.time-btn", { onClick: () => this.advance("month"), title: "Avançar 1 mês" }, "+1m"),
        el("button.time-btn", { onClick: () => this.advance("year"), title: "Avançar 1 ano" }, "+1a"),
        el("button.time-btn.primary", { onClick: () => this.advance("event"), title: "Avançar até o próximo evento" }, "▶ Evento")
      )
    );
  }

  bottomNav() {
    return el(
      "nav.bottomnav",
      ...PAGES.map((p) =>
        el(
          `button.nav-btn${p.id === this.page ? ".active" : ""}`,
          { onClick: () => { this.page = p.id; this.renderShell(); } },
          el("span.nav-icon", p.icon),
          el("span.nav-label", p.label)
        )
      )
    );
  }

  renderPage() {
    const c = this.contentEl;
    const openAthlete = (id) => this.openAthlete(id);
    const openComp = (id) => this.openCompetition(id);
    const openCountry = (code) => this.openCountry(code);
    if (this.page === "ranking") renderRanking(c, this.game, openAthlete, this.pageState);
    else if (this.page === "calendar") renderCalendar(c, this.game, this.pageState, openComp);
    else if (this.page === "news") renderNews(c, this.game, openComp, openAthlete);
    else if (this.page === "countries") renderCountries(c, this.game, openCountry);
    else if (this.page === "favorites") renderFavorites(c, this.game, openAthlete, this.pageState);
  }

  // ---- Comandos de tempo ---------------------------------------------------
  advance(kind) {
    const label = kind === "year" ? "Simulando o ano…" : kind === "month" ? "Simulando o mês…" : "Simulando…";
    this.withLoading(label, () => {
      let res;
      if (kind === "day") res = this.game.advanceOneDay();
      else if (kind === "month") res = this.game.advanceOneMonth();
      else if (kind === "year") res = this.game.advanceOneYear();
      else res = this.game.advanceToNextEvent();
      this.renderShell();
      if (!res) return;
      // A virada de ano tem prioridade: mostra a tela especial de fim de ano.
      if (res.yearEnd) this.showYearEnd(res.yearEnd);
      else if (res.results && res.results.length) this.showResults(res);
    });
  }

  /** Tela especial de fim de ano: ranking de janeiro + variação anual. */
  showYearEnd(data) {
    const state = { catIndex: 0 };
    const body = el("div.yearend-body");
    const tabs = el(
      "div.tabs",
      ...data.categories.map((c, i) =>
        el(`button.tab${i === 0 ? ".active" : ""}`,
          { onClick: () => { state.catIndex = i; rerender(); } }, c.categoryName)
      )
    );
    const overlay = el("div.modal-overlay", { onClick: (e) => { if (e.target === overlay) overlay.remove(); } });
    const content = el(
      "div.modal-content.results.yearend",
      el("div.modal-head",
        el("div.modal-title",
          el("h3", `Ranking de Janeiro de ${data.year}`),
          el("div.modal-sub", `variação de posições desde o início de ${data.previousYear}`)
        ),
        el("button.icon-btn", { onClick: () => overlay.remove() }, "✕")
      ),
      tabs,
      body
    );

    function rerender() {
      [...tabs.children].forEach((b, i) => b.classList.toggle("active", i === state.catIndex));
      const cat = data.categories[state.catIndex];
      body.replaceChildren(
        cat.rows.length
          ? el("div.list.compact",
              ...cat.rows.map((r) =>
                el("div.row.yearend-row",
                  el("span.pos", `${r.position}`),
                  rankMovement(r.delta),
                  el("span.flag.flag-lg", r.flag || "🏳"),
                  el("span.row-main",
                    el("span.row-name", r.name),
                    el("span.row-sub", r.ioc)),
                  el("span.pts", `${r.points}`)
                )
              )
            )
          : el("p.empty", "Sem ranking para comparar.")
      );
    }

    rerender();
    overlay.append(content);
    this.root.append(overlay);
  }

  showResults(res) {
    const items = res.results.filter(Boolean);
    const overlay = el(
      "div.modal-overlay",
      { onClick: (e) => { if (e.target === overlay) overlay.remove(); } },
      el(
        "div.modal-content.results",
        el("div.modal-head",
          el("h3", `Resultados — ${fmtDate(res.date)}`),
          el("button.icon-btn", { onClick: () => overlay.remove() }, "✕")
        ),
        ...items.map((r) =>
          el("div.card.result-card",
            el("div.result-name", `${r.name} `, el("span.badge", r.gRank)),
            el("div.result-podiums",
              ...Object.entries(r.podiums).map(([cat, champ]) =>
                el("div.podium-line", el("span.podium-cat", cat), el("span.podium-champ", champ ? `🥇 ${champ.flag || ""} ${champ.name}` : "—"))
              )
            )
          )
        )
      )
    );
    this.root.append(overlay);
  }

  openAthlete(id) {
    const view = this.game.getAthlete(id);
    if (!view) return;
    const modal = athleteModal(view, {
      onClose: () => modal.remove(),
      onToggleFavorite: (aid) => this.game.toggleFavoriteAthlete(aid),
      onCompetition: (cid) => this.openCompetition(cid),
      onAthlete: (aid) => this.openAthlete(aid),
    });
    this.root.append(modal);
  }

  openCompetition(id) {
    const view = this.game.getCompetitionView(id);
    if (!view) return;
    const modal = competitionModal(view, {
      onClose: () => modal.remove(),
      onAthlete: (aid) => this.openAthlete(aid),
      state: {},
    });
    this.root.append(modal);
  }

  openCountry(code) {
    const view = this.game.getCountryView(code);
    if (!view) return;
    const modal = countryModal(view, {
      onClose: () => modal.remove(),
      onAthlete: (aid) => this.openAthlete(aid),
    });
    this.root.append(modal);
  }

  // ---- utilidades ----------------------------------------------------------
  withLoading(message, fn) {
    mount(this.root, el("div.screen.loading", el("div.spinner"), el("p", message)));
    // deixa o navegador pintar o loading antes do trabalho pesado
    requestAnimationFrame(() => requestAnimationFrame(() => fn()));
  }
}
