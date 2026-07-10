/**
 * App — máquina de estados e casca da interface (mobile-first).
 *
 * Estados: MENU → SIMULATION. A interface só exibe e emite comandos ao
 * GameController; nunca contém lógica de simulação (DiretrizdeArquitetura).
 * Comunicação de atualização via re-render após comandos.
 */

import { el, mount, fmtDate } from "./dom.js";
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
        el("button.time-btn", { onClick: () => this.advance("day"), title: "Avançar 1 dia" }, "+1 dia"),
        el("button.time-btn.primary", { onClick: () => this.advance("event"), title: "Avançar até o próximo evento" }, "▶ Próximo evento")
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
    this.withLoading("Simulando…", () => {
      const res = kind === "day" ? this.game.advanceOneDay() : this.game.advanceToNextEvent();
      this.renderShell();
      if (res && res.results && res.results.length) this.showResults(res);
    });
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
