/**
 * GameController — fachada entre a Interface e o Motor.
 *
 * A interface NUNCA acessa o mundo/engine diretamente (DiretrizdeArquitetura):
 * ela emite comandos e faz consultas por aqui. Este controlador possui o
 * WorldState, o Simulation Director, o Event Bus e a persistência, e expõe:
 *   - Comandos: newGame, advanceToNextEvent, advanceOneDay, favorite, save/load.
 *   - Consultas: ranking, atleta, países, calendário, notícias, busca.
 *
 * Nenhuma regra de simulação vive aqui — apenas coordenação e leitura.
 */

import { buildRealWorld } from "../database/realSeed.js";
import { SimulationDirector } from "../engine/simulationDirector.js";
import { buildSeasonCalendar } from "../engine/season.js";
import { RandomSystem } from "../services/random.js";
import { IdGenerator } from "../utils/ids.js";
import { EventBus } from "../services/eventBus.js";
import { StorageService } from "../services/storage.js";
import { MEN_CATEGORIES, getWeightCategory } from "../config/weightCategories.js";
import { championPointsFor, G_RANK_LABELS } from "../entities/competition.js";
import { TECHNICAL, PHYSICAL, MENTAL } from "../config/attributes.js";
import { yearOf } from "../utils/dates.js";

const SAVE_KEY = "world";
const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

export class GameController {
  /**
   * @param {object} deps { storage } — StorageService (backend localStorage no
   *   navegador; memória nos testes).
   */
  constructor({ storage }) {
    this.storage = storage;
    this.bus = new EventBus();
    this.world = null;
    this.random = null;
    this.idGen = null;
    this.director = null;
    this.nextOffset = 1; // próxima temporada a agendar (2026 + offset)
  }

  // ---- Ciclo de vida -------------------------------------------------------

  /** Existe um jogo salvo? */
  hasSave() {
    return this.storage.has(SAVE_KEY);
  }

  /** Inicia um novo mundo a partir dos dados reais. */
  newGame(seed = 20260701) {
    const built = buildRealWorld({ seed });
    this.world = built.world;
    this.random = built.random;
    this.idGen = built.idGen;
    this.nextOffset = 1;
    this._makeDirector();
    this._scheduleNextSeason();
    this.save();
    this.bus.publish("GameLoaded", { fresh: true });
    return this;
  }

  /** Carrega o jogo salvo. */
  loadGame() {
    const saved = this.storage.load(SAVE_KEY);
    if (!saved) return this.newGame();
    this.world = saved;
    this.random = new RandomSystem(saved.meta.seed);
    if (typeof saved.rngState === "number") this.random.setState(saved.rngState);
    this.idGen = new IdGenerator(saved.idState || {});
    // Retoma o offset a partir das competições já agendadas.
    const years = Object.values(this.world.competitions).map((c) => yearOf(c.date));
    const maxYear = years.length ? Math.max(...years) : 2026;
    this.nextOffset = Math.max(1, maxYear - 2026 + 1);
    this._makeDirector();
    this._ensureUpcoming();
    this.bus.publish("GameLoaded", { fresh: false });
    return this;
  }

  save() {
    this.storage.save(SAVE_KEY, this.world);
  }

  _makeDirector() {
    this.director = new SimulationDirector({
      world: this.world,
      random: this.random,
      idGen: this.idGen,
      eventBus: this.bus,
      storage: this.storage,
    });
  }

  // ---- Agendamento de temporadas ------------------------------------------

  _scheduleNextSeason() {
    buildSeasonCalendar(this.world, this.idGen, {
      yearOffset: this.nextOffset,
      categoryFilter: MEN_IDS,
    });
    this.nextOffset += 1;
  }

  /** Garante que exista pelo menos um evento futuro agendado. */
  _ensureUpcoming() {
    let guard = 0;
    while (!this._nextPendingDate() && guard < 5) {
      this._scheduleNextSeason();
      guard += 1;
    }
  }

  _nextPendingDate() {
    const today = this.world.state.currentDate;
    let best = null;
    for (const e of this.world.calendar) {
      if (!e.processed && e.date >= today && (best === null || e.date < best)) {
        best = e.date;
      }
    }
    return best;
  }

  // ---- Comandos de tempo ---------------------------------------------------

  /**
   * Avança até o próximo dia com competição (processando os dias no caminho).
   * @returns {{date: string, results: Array}|null}
   */
  advanceToNextEvent() {
    this._ensureUpcoming();
    const target = this._nextPendingDate();
    if (!target) return null;
    const finished = [];
    const off = this.bus.on("CompetitionFinished", (ev) =>
      finished.push(ev.payload.competitionId)
    );
    this.director.advanceUntil(target);
    off();
    this._ensureUpcoming();
    return { date: target, results: finished.map((id) => this._competitionSummary(id)) };
  }

  /** Avança um único dia. */
  advanceOneDay() {
    const finished = [];
    const off = this.bus.on("CompetitionFinished", (ev) =>
      finished.push(ev.payload.competitionId)
    );
    this.director.advanceDay();
    off();
    this._ensureUpcoming();
    return {
      date: this.world.state.currentDate,
      results: finished.map((id) => this._competitionSummary(id)),
    };
  }

  // ---- Favoritos -----------------------------------------------------------

  toggleFavoriteAthlete(athleteId) {
    const list = this.world.favorites.athletes;
    const i = list.indexOf(athleteId);
    if (i >= 0) list.splice(i, 1);
    else list.push(athleteId);
    this.save();
    return i < 0;
  }

  isFavoriteAthlete(athleteId) {
    return this.world.favorites.athletes.includes(athleteId);
  }

  // ---- Consultas -----------------------------------------------------------

  getState() {
    const s = this.world.state;
    return { currentDate: s.currentDate, season: yearOf(s.currentDate), processedDays: s.processedDays };
  }

  getCategories() {
    return MEN_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));
  }

  _countryOf(athlete) {
    return this.world.countries[athlete.countryId] || { code: "??", name: "?" };
  }

  getRanking(categoryId, limit = 50) {
    const ranking = this.world.rankings[categoryId];
    if (!ranking) return [];
    return ranking.athleteIds.slice(0, limit).map((id, i) => {
      const a = this.world.athletes[id];
      const c = this._countryOf(a);
      return {
        id: a.id,
        position: i + 1,
        name: a.fullName,
        ioc: c.code,
        countryName: c.name,
        points: a.ranking.points,
        favorite: this.isFavoriteAthlete(a.id),
      };
    });
  }

  getAthlete(id) {
    const a = this.world.athletes[id];
    if (!a) return null;
    const c = this._countryOf(a);
    const visible = {};
    for (const key of [...TECHNICAL, ...PHYSICAL, ...MENTAL]) visible[key] = a.attributes[key];
    const cat = getWeightCategory(a.weightCategoryId);
    return {
      id: a.id,
      name: a.fullName,
      ioc: c.code,
      countryName: c.name,
      category: cat ? cat.name : a.weightCategoryId,
      age: yearOf(this.world.state.currentDate) - yearOf(a.birthDate),
      status: a.status,
      position: a.ranking.position,
      points: a.ranking.points,
      favorite: this.isFavoriteAthlete(a.id),
      attributes: visible,
      form: a.attributes.formaAtual,
      morale: a.attributes.moral,
      experience: a.attributes.experiencia,
      statistics: { ...a.statistics },
      history: [...a.history].reverse().slice(0, 12).map((h) => ({
        date: h.date,
        competition: this.world.competitions[h.competitionId]?.name || "?",
        placement: h.placement,
        medal: h.medal,
        points: h.pointsEarned,
      })),
    };
  }

  getCountryTable(limit = 30) {
    return Object.values(this.world.countries)
      .map((c) => ({
        code: c.code,
        name: c.name,
        golds: c.statistics.golds,
        silvers: c.statistics.silvers,
        bronzes: c.statistics.bronzes,
        points: c.statistics.rankingPoints,
        athletes: c.athleteIds.length,
      }))
      .filter((c) => c.athletes > 0)
      .sort((a, b) => b.points - a.points || b.golds - a.golds)
      .slice(0, limit);
  }

  getUpcomingEvents(limit = 20) {
    const today = this.world.state.currentDate;
    return this.world.calendar
      .filter((e) => !e.processed && e.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, limit)
      .map((e) => {
        const c = this.world.competitions[e.competitionId];
        return {
          date: e.date,
          name: c.name,
          gRank: c.gRank,
          gLabel: G_RANK_LABELS[c.gRank] || c.gRank,
          location: c.location,
          championPoints: championPointsFor(c.gRank),
        };
      });
  }

  getRecentResults(limit = 15) {
    return [...this.world.history]
      .reverse()
      .slice(0, limit)
      .map((h) => ({
        date: h.date,
        competition: h.competitionName,
        gRank: h.gRank,
        category: getWeightCategory(h.categoryId)?.name || h.categoryId,
        champion: this.world.athletes[h.champion]?.fullName || "?",
        championIoc: this._countryOf(this.world.athletes[h.champion] || {}).code || "??",
      }));
  }

  _competitionSummary(competitionId) {
    const c = this.world.competitions[competitionId];
    if (!c) return null;
    const podiums = {};
    for (const [catId, placements] of Object.entries(c.results)) {
      const champ = placements.find((p) => p.placement === 1);
      const a = champ && this.world.athletes[champ.athleteId];
      podiums[getWeightCategory(catId)?.name || catId] = a
        ? { name: a.fullName, ioc: this._countryOf(a).code }
        : null;
    }
    return { name: c.name, gRank: c.gRank, date: c.date, podiums };
  }

  /** Busca simples por nome de atleta (romanizado). */
  searchAthletes(query, limit = 20) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const a of Object.values(this.world.athletes)) {
      if (a.fullName.toLowerCase().includes(q)) {
        const c = this._countryOf(a);
        out.push({
          id: a.id, name: a.fullName, ioc: c.code,
          category: getWeightCategory(a.weightCategoryId)?.name, points: a.ranking.points,
        });
        if (out.length >= limit) break;
      }
    }
    return out;
  }
}
