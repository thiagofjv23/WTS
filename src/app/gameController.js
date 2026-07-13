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
import { yearOf, addMonths, addYears } from "../utils/dates.js";
import { flagEmoji } from "../config/flags.js";
import { continentOf } from "../config/continents.js";
import { classifyEvent, isEligible, applyNationalLimit } from "../engine/eligibility.js";
import { enterProbability } from "../engine/participation.js";
import { rivalsOf } from "../engine/rivalry.js";
import { wildcardEntrantsFor } from "../engine/wildcards.js";
import { scheduleNationalSelectives, isSelective, selectiveParticipants } from "../engine/nationalTeams.js";
import { scheduleGrandSlam } from "../engine/grandSlam.js";
import { athletesInCategory } from "../core/world.js";

const SAVE_KEY = "world";
const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);
const SEASON_BASE_YEAR = 2026; // 1ª temporada; offsets de temporada são relativos a ele

/** Rótulo da rodada a partir do tamanho (2 = Final, 4 = Semifinal, …). */
function roundLabel(roundSize) {
  if (roundSize === 2) return "Final";
  if (roundSize === 4) return "Semifinal";
  if (roundSize === 8) return "Quartas de final";
  if (roundSize === 16) return "Oitavas de final";
  return `Rodada de ${roundSize}`;
}

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
    // Cache de campo projetado por (competição|categoria). O campo depende do
    // ranking (mensal) e do plantel; com o roster completo (~1.028/categoria)
    // recalcular a cada abertura de ficha custa caro, então memoizamos e
    // limpamos a cada avanço de tempo. Ver DECISIONS.md.
    this._fieldCache = new Map();
    // Próxima temporada a agendar = 2026 + offset. Começa em 0: a 1ª temporada
    // simulada é 2026 (o mundo inicia em 01/01/2026 e todos os eventos do ano
    // ficam à frente).
    this.nextOffset = 0;
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
    this.nextOffset = 0;
    this._fieldCache.clear();
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
    // Retoma o offset a partir das competições já agendadas (próxima temporada
    // ainda não agendada = maior ano agendado + 1).
    const years = Object.values(this.world.competitions).map((c) => yearOf(c.date));
    const maxYear = years.length ? Math.max(...years) : 2025;
    this.nextOffset = Math.max(0, maxYear - 2026 + 1);
    this._fieldCache.clear();
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
    const year = SEASON_BASE_YEAR + this.nextOffset;
    buildSeasonCalendar(this.world, this.idGen, {
      yearOffset: this.nextOffset,
      categoryFilter: MEN_IDS,
    });
    // Seletivas Nacionais de janeiro (países com mais de 20 atletas).
    scheduleNationalSelectives(this.world, this.idGen, { year, categoryFilter: MEN_IDS });
    // Grand Slam Champions Series (fim de dezembro, top 16 por convite).
    scheduleGrandSlam(this.world, this.idGen, { year, categoryFilter: MEN_IDS });
    this.nextOffset += 1;
  }

  /**
   * Garante que todas as temporadas até (inclusive) `year` estejam agendadas.
   * Necessário para avanços em bloco (mês/ano), que podem ultrapassar o
   * calendário já agendado — sem isso, os eventos do período seriam perdidos.
   */
  _ensureScheduledUntilYear(year) {
    let guard = 0;
    while (SEASON_BASE_YEAR + this.nextOffset <= year && guard < 60) {
      this._scheduleNextSeason();
      guard += 1;
    }
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
  /** Guarda a posição atual de cada atleta (base das setas de movimento). */
  _snapshotRankingPositions() {
    for (const a of Object.values(this.world.athletes)) {
      a.ranking.previousPosition = a.ranking.position;
    }
  }

  advanceToNextEvent() {
    this._ensureUpcoming();
    const target = this._nextPendingDate();
    if (!target) return null;
    const yearBefore = yearOf(this.world.state.currentDate);
    this._snapshotRankingPositions();
    const finished = [];
    const off = this.bus.on("CompetitionFinished", (ev) =>
      finished.push(ev.payload.competitionId)
    );
    this.director.advanceUntil(target);
    off();
    this._fieldCache.clear(); // o mundo mudou: invalida os campos projetados
    this._ensureUpcoming();
    return {
      date: target,
      results: finished.map((id) => this._competitionSummary(id)),
      yearEnd: this._yearEndIfCrossed(yearBefore),
    };
  }

  /** Avança um único dia. */
  advanceOneDay() {
    const yearBefore = yearOf(this.world.state.currentDate);
    this._snapshotRankingPositions();
    const finished = [];
    const off = this.bus.on("CompetitionFinished", (ev) =>
      finished.push(ev.payload.competitionId)
    );
    this.director.advanceDay();
    off();
    this._fieldCache.clear(); // o mundo mudou: invalida os campos projetados
    this._ensureUpcoming();
    return {
      date: this.world.state.currentDate,
      results: finished.map((id) => this._competitionSummary(id)),
      yearEnd: this._yearEndIfCrossed(yearBefore),
    };
  }

  /** Avança um mês inteiro (mesmo processamento dia a dia dos demais avanços). */
  advanceOneMonth() {
    return this._advanceSpan(addMonths(this.world.state.currentDate, 1));
  }

  /** Avança um ano inteiro (mesmo processamento dia a dia dos demais avanços). */
  advanceOneYear() {
    return this._advanceSpan(addYears(this.world.state.currentDate, 1));
  }

  /**
   * Avança em bloco até `targetDate` (processando cada dia). Não abre o modal de
   * resultados por competição (seriam muitos); o destaque é a tela de fim de ano.
   */
  _advanceSpan(targetDate) {
    this._ensureScheduledUntilYear(yearOf(targetDate));
    const yearBefore = yearOf(this.world.state.currentDate);
    this._snapshotRankingPositions();
    this.director.advanceUntil(targetDate);
    this._fieldCache.clear();
    this._ensureUpcoming();
    return {
      date: this.world.state.currentDate,
      results: [],
      yearEnd: this._yearEndIfCrossed(yearBefore),
    };
  }

  /** Se o avanço cruzou a virada de ano, devolve o resumo de fim de ano. */
  _yearEndIfCrossed(yearBefore) {
    const yearNow = yearOf(this.world.state.currentDate);
    return yearNow > yearBefore ? this.getYearEndSummary(yearNow) : null;
  }

  /**
   * Resumo de fim de ano: ranking de janeiro do `newYear` (top 30 por categoria)
   * com a variação de posições em relação a janeiro do ano anterior.
   */
  getYearEndSummary(newYear, top = 30) {
    const snaps = this.world.yearRankSnapshots || {};
    const cur = snaps[String(newYear)];
    if (!cur) return null;
    const prev = snaps[String(newYear - 1)] || {};
    const categories = MEN_CATEGORIES.map((cat) => {
      const curList = cur[cat.id] || [];
      const prevPos = new Map((prev[cat.id] || []).map(([id], i) => [id, i + 1]));
      const rows = curList.slice(0, top).map(([id, pts], i) => {
        const a = this.world.athletes[id];
        const c = a ? this._countryOf(a) : { code: "??" };
        const position = i + 1;
        const pp = prevPos.get(id);
        return {
          id, position,
          name: a ? a.fullName : "?",
          ioc: c.code, flag: flagEmoji(c.code),
          points: Math.round(pts * 100) / 100,
          nationalTeam: a?.nationalTeam || null,
          // delta > 0 = subiu posições; null = não estava no ranking do ano anterior.
          delta: pp == null ? null : pp - position,
        };
      });
      return { categoryId: cat.id, categoryName: cat.name, rows };
    });
    return { year: newYear, previousYear: newYear - 1, categories };
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

  /** Lista resumida dos atletas favoritados (para a aba de Favoritos). */
  getFavoriteAthletes() {
    return this.world.favorites.athletes
      .map((id) => this.world.athletes[id])
      .filter(Boolean)
      .map((a) => this._athleteRow(a))
      .sort((x, y) => y.points - x.points);
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

  /** Info de país pronta para a UI (código, nome, bandeira). */
  countryView(ioc) {
    return { ioc, flag: flagEmoji(ioc) };
  }

  /** Linha compacta de atleta (favoritos, busca, país). */
  _athleteRow(a) {
    const c = this._countryOf(a);
    return {
      id: a.id,
      name: a.fullName,
      ioc: c.code,
      flag: flagEmoji(c.code),
      category: getWeightCategory(a.weightCategoryId)?.name || a.weightCategoryId,
      position: a.ranking.position,
      points: a.ranking.points,
      injured: a.status === "lesionado",
      nationalTeam: a.nationalTeam || null,
      favorite: this.isFavoriteAthlete(a.id),
    };
  }

  /** Ranking da categoria. Sem `limit` retorna TODOS os atletas ranqueados. */
  getRanking(categoryId, limit = Infinity) {
    const ranking = this.world.rankings[categoryId];
    if (!ranking) return [];
    return ranking.athleteIds.slice(0, limit).map((id, i) => {
      const a = this.world.athletes[id];
      const c = this._countryOf(a);
      const prev = a.ranking.previousPosition;
      const position = i + 1;
      // delta > 0 = subiu; < 0 = caiu; null = novo/sem referência.
      const delta = prev == null ? null : prev - position;
      return {
        id: a.id,
        position,
        name: a.fullName,
        ioc: c.code,
        flag: flagEmoji(c.code),
        countryName: c.name,
        points: a.ranking.points,
        favorite: this.isFavoriteAthlete(a.id),
        injured: a.status === "lesionado",
        nationalTeam: a.nationalTeam || null,
        delta,
      };
    });
  }

  /** Total de atletas ranqueados numa categoria. */
  getRankingSize(categoryId) {
    return this.world.rankings[categoryId]?.athleteIds.length || 0;
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
      flag: flagEmoji(c.code),
      countryName: c.name,
      category: cat ? cat.name : a.weightCategoryId,
      weightCategoryId: a.weightCategoryId,
      age: yearOf(this.world.state.currentDate) - yearOf(a.birthDate),
      status: a.status,
      injuredUntil: a.condition?.injuredUntil ?? null,
      nationalTeam: a.nationalTeam || null,
      position: a.ranking.position,
      points: a.ranking.points,
      favorite: this.isFavoriteAthlete(a.id),
      attributes: visible,
      form: a.attributes.formaAtual,
      morale: a.attributes.moral,
      experience: a.attributes.experiencia,
      statistics: { ...a.statistics },
      rivals: this.getAthleteRivals(a.id),
      upcoming: this.getAthleteUpcoming(a.id),
      history: [...a.history].reverse().slice(0, 20).map((h) => ({
        date: h.date,
        competition: this.world.competitions[h.competitionId]?.name || "?",
        competitionId: h.competitionId,
        placement: h.placement,
        medal: h.medal,
        points: h.pointsEarned,
      })),
    };
  }

  /** Rivais do atleta (retrospecto e intensidade), mais fortes primeiro. */
  getAthleteRivals(athleteId, limit = 6) {
    const list = rivalsOf(this.world, athleteId, this.world.state.currentDate, limit);
    return list.map((r) => {
      const opp = this.world.athletes[r.opponentId];
      const c = opp ? this._countryOf(opp) : { code: "??" };
      return {
        opponentId: r.opponentId,
        name: opp ? opp.fullName : "?",
        ioc: c.code,
        flag: flagEmoji(c.code),
        level: r.level,
        meetings: r.meetings,
        decisive: r.decisive,
        wins: r.wins,
        losses: r.losses,
        lastGRank: r.lastGRank,
        lastDate: r.lastDate,
      };
    });
  }

  /** Próximos campeonatos em que o atleta deve competir (campo projetado). */
  getAthleteUpcoming(athleteId, limit = 12) {
    const athlete = this.world.athletes[athleteId];
    if (!athlete) return [];
    const today = this.world.state.currentDate;
    const cat = athlete.weightCategoryId;
    const events = this.world.calendar
      .filter((e) => !e.processed && e.date >= today)
      .map((e) => this.world.competitions[e.competitionId])
      .filter((c) => c && c.categoryIds.includes(cat))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const out = [];
    for (const c of events) {
      const field = this._projectedFieldIds(c, cat);
      if (field.has(athleteId)) {
        out.push({
          id: c.id, name: c.name, date: c.date, gRank: c.gRank,
          location: c.location,
          championPoints: isSelective(c) ? 0 : championPointsFor(c.gRank),
          selective: isSelective(c),
        });
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  /** IDs do campo projetado de uma categoria num evento (aplica as travas). */
  _projectedFieldIds(competition, categoryId) {
    return new Set(this.projectedField(competition, categoryId).map((a) => a.id));
  }

  /**
   * Campo projetado (prováveis inscritos) de uma categoria: aplica as travas de
   * elegibilidade e limita ao fieldSize por ranking. Exato para eventos por
   * convite (Grand Prix/continental); aproximação para Opens.
   */
  projectedField(competition, categoryId, limit = null) {
    const cacheKey = `${competition.id}|${categoryId}|${limit ?? ""}`;
    const cached = this._fieldCache.get(cacheKey);
    if (cached) return cached;
    // Seletiva Nacional: o campo é o do próprio país (não as travas normais).
    if (isSelective(competition)) {
      const out = selectiveParticipants(this.world, competition, categoryId).map((a, i) => {
        const c = this._countryOf(a);
        return {
          id: a.id, seed: i + 1, name: a.fullName, ioc: c.code, flag: flagEmoji(c.code),
          position: a.ranking.position, points: a.ranking.points,
          wildcard: false, nationalTeam: a.nationalTeam || null,
        };
      });
      this._fieldCache.set(cacheKey, out);
      return out;
    }
    const rules = classifyEvent(competition);
    let pool = athletesInCategory(this.world, categoryId).filter((a) =>
      isEligible(a, this.world, rules)
    );
    if (rules.nationalLimit) pool = applyNationalLimit(pool, this.world, rules.nationalLimit);
    // Wildcards da President's Cup: agraciados entram além do 1 por país.
    // (evento concluído: usa o registro salvo; futuro: resolve pelo estado atual)
    const wildcardIds = new Set(
      competition.wildcards?.[categoryId] ?? wildcardEntrantsFor(this.world, competition, categoryId)
    );
    for (const id of wildcardIds) {
      const a = this.world.athletes[id];
      if (a && !pool.includes(a)) pool.push(a);
    }
    // Opens: mantém apenas quem provavelmente se inscreve (a elite ignora
    // eventos pequenos). Eventos por convite: todos os elegíveis comparecem.
    if (!rules.invitational) {
      const catSize = this.world.rankings[categoryId]?.athleteIds.length || pool.length;
      pool = pool.filter((a) => enterProbability(a, competition, catSize) >= 0.45 || wildcardIds.has(a.id));
    }
    pool.sort((a, b) => b.ranking.points - a.ranking.points);
    const size = limit ?? competition.fieldSize ?? pool.length;
    const out = pool.slice(0, size).map((a, i) => {
      const c = this._countryOf(a);
      return {
        id: a.id, seed: i + 1, name: a.fullName, ioc: c.code, flag: flagEmoji(c.code),
        position: a.ranking.position, points: a.ranking.points,
        wildcard: wildcardIds.has(a.id),
        nationalTeam: a.nationalTeam || null,
      };
    });
    this._fieldCache.set(cacheKey, out);
    return out;
  }

  getCountryTable(limit = 30) {
    return Object.values(this.world.countries)
      .map((c) => ({
        code: c.code,
        name: c.name,
        flag: flagEmoji(c.code),
        continent: continentOf(c.code),
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
        const sel = isSelective(c);
        return {
          date: e.date,
          name: c.name,
          gRank: c.gRank,
          gLabel: sel ? "Seletiva Nacional" : (G_RANK_LABELS[c.gRank] || c.gRank),
          location: c.location,
          championPoints: sel ? 0 : championPointsFor(c.gRank),
          selective: sel,
        };
      });
  }

  /**
   * Agenda completa de uma temporada (ano): todos os eventos, realizados e
   * agendados, em ordem de data. Permite ver o ano inteiro logo no início.
   * @param {number} [year]  padrão: ano da data atual.
   */
  getSeasonSchedule(year) {
    const y = year || yearOf(this.world.state.currentDate);
    const today = this.world.state.currentDate;
    return Object.values(this.world.competitions)
      .filter((c) => yearOf(c.date) === y)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((c) => {
        const sel = isSelective(c);
        return {
          id: c.id,
          date: c.date,
          name: c.name,
          gRank: c.gRank,
          gLabel: sel ? "Seletiva Nacional" : (G_RANK_LABELS[c.gRank] || c.gRank),
          location: c.location,
          championPoints: sel ? 0 : championPointsFor(c.gRank),
          selective: sel,
          done: c.status === "concluida" || c.date < today,
        };
      });
  }

  /**
   * Visão completa de um campeonato para a interface.
   * - Antes: campo projetado (prováveis inscritos) por categoria.
   * - Depois: resultados das lutas + classificação final por peso.
   */
  getCompetitionView(competitionId) {
    const c = this.world.competitions[competitionId];
    if (!c) return null;
    const done = c.status === "concluida";
    const rules = classifyEvent(c);
    const categories = c.categoryIds.map((catId) => {
      const catName = getWeightCategory(catId)?.name || catId;
      if (done) {
        const wildcardSet = new Set(c.wildcards?.[catId] || []);
        const placements = (c.results[catId] || []).map((p) => {
          const a = this.world.athletes[p.athleteId];
          const cc = a ? this._countryOf(a) : { code: "??" };
          return {
            athleteId: p.athleteId,
            name: a ? a.fullName : "?",
            ioc: cc.code, flag: flagEmoji(cc.code),
            placement: p.placement, medal: p.medal,
            points: p.rankingPointsEarned ?? 0,
            wildcard: wildcardSet.has(p.athleteId),
            nationalTeam: a?.nationalTeam || null,
          };
        });
        const matches = (c.matches || [])
          .filter((m) => m.categoryId === catId)
          .map((m) => this._matchView(m));
        return { categoryId: catId, categoryName: catName, placements, matches };
      }
      return {
        categoryId: catId,
        categoryName: catName,
        field: this.projectedField(c, catId),
      };
    });
    const selective = isSelective(c);
    return {
      id: c.id, name: c.name, gRank: c.gRank,
      gLabel: selective ? "Seletiva Nacional" : (G_RANK_LABELS[c.gRank] || c.gRank),
      date: c.date, location: c.location,
      championPoints: selective ? 0 : championPointsFor(c.gRank),
      done, selective,
      eligibility: selective ? {} : {
        rankingLockTopN: rules.rankingLockTopN,
        continent: rules.continent,
        arabOnly: rules.arabOnly,
        nationalLimit: rules.nationalLimit,
      },
      categories,
    };
  }

  _matchView(m) {
    const name = (id) => this.world.athletes[id]?.fullName || "?";
    const flag = (id) => flagEmoji(this._countryOf(this.world.athletes[id] || {}).code);
    return {
      round: m.round,
      roundLabel: roundLabel(m.round),
      // rank = posição no ranking no início do campeonato (ideia do chaveamento).
      a: { id: m.aId, name: name(m.aId), flag: flag(m.aId), rank: m.aRank ?? null },
      b: { id: m.bId, name: name(m.bId), flag: flag(m.bId), rank: m.bRank ?? null },
      winnerId: m.winnerId,
      score: m.score,
      rivalry: m.rivalry || 0, // nível de rivalidade que influenciou esta luta
    };
  }

  /** Anos que possuem eventos agendados (para navegação do calendário). */
  getScheduledYears() {
    const years = new Set(
      Object.values(this.world.competitions).map((c) => yearOf(c.date))
    );
    return [...years].sort((a, b) => a - b);
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
        championId: h.champion,
        champion: this.world.athletes[h.champion]?.fullName || "?",
        championIoc: this._countryOf(this.world.athletes[h.champion] || {}).code || "??",
        championFlag: flagEmoji(this._countryOf(this.world.athletes[h.champion] || {}).code),
        competitionId: h.competitionId,
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
        ? { name: a.fullName, ioc: this._countryOf(a).code, flag: flagEmoji(this._countryOf(a).code) }
        : null;
    }
    return { name: c.name, gRank: c.gRank, date: c.date, podiums };
  }

  /** Busca simples por nome de atleta (romanizado). */
  searchAthletes(query, limit = 30) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const a of Object.values(this.world.athletes)) {
      if (a.fullName.toLowerCase().includes(q)) {
        out.push(this._athleteRow(a));
        if (out.length >= limit) break;
      }
    }
    return out.sort((x, y) => y.points - x.points);
  }

  /**
   * Feed de notícias: campeões recentes + lesões/recuperações, por data (desc).
   */
  getNews(limit = 30) {
    const feed = [];
    // Campeões recentes (do histórico).
    for (const h of this.world.history.slice(-60)) {
      const champ = this.world.athletes[h.champion];
      const c = champ ? this._countryOf(champ) : { code: "??" };
      feed.push({
        type: "champion",
        date: h.date,
        competition: h.competitionName,
        competitionId: h.competitionId,
        gRank: h.gRank,
        category: getWeightCategory(h.categoryId)?.name || h.categoryId,
        athleteId: h.champion,
        name: champ ? champ.fullName : "?",
        flag: flagEmoji(c.code),
        nationalTeam: champ ? champ.nationalTeam || null : null,
      });
    }
    // Lesões, recuperações e convocações para a seleção.
    for (const n of this.world.news) {
      const a = this.world.athletes[n.athleteId];
      const c = a ? this._countryOf(a) : { code: "??" };
      const injured = n.type === "callup" ? this.world.athletes[n.injuredId] : null;
      feed.push({
        type: n.type, // "injury" | "recovery" | "callup"
        date: n.date,
        athleteId: n.athleteId,
        name: a ? a.fullName : "?",
        flag: flagEmoji(c.code),
        severity: n.severity,
        until: n.until,
        category: a ? getWeightCategory(a.weightCategoryId)?.name : null,
        nationalTeam: a ? a.nationalTeam || null : null,
        replacing: injured ? injured.fullName : null,
      });
    }
    feed.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
    return feed.slice(0, limit);
  }

  /**
   * Detalhe de um país: estatísticas + atletas (com posição no ranking).
   * @param {string} code  código IOC
   */
  getCountryView(code) {
    const country = Object.values(this.world.countries).find((c) => c.code === code);
    if (!country) return null;
    const athletes = country.athleteIds
      .map((id) => this.world.athletes[id])
      .filter(Boolean)
      .map((a) => this._athleteRow(a))
      .sort((x, y) => y.points - x.points);
    // Melhor atleta por categoria.
    const bestByCategory = MEN_CATEGORIES.map((cat) => {
      const best = athletes.find((a) => a.category === cat.name);
      return { category: cat.name, athlete: best || null };
    });
    return {
      code: country.code,
      name: country.name,
      flag: flagEmoji(country.code),
      continent: continentOf(country.code),
      statistics: { ...country.statistics },
      athleteCount: athletes.length,
      bestByCategory,
      athletes,
    };
  }
}
