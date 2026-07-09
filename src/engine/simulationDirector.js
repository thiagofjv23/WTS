/**
 * Simulation Director — orquestrador central da simulação.
 * (simulation_director.md / SimulationPipeline.md).
 *
 * Não contém regras de negócio: apenas coordena a ordem dos sistemas e publica
 * eventos no World Event Bus. A ordem do pipeline diário é determinística.
 *
 * Pipeline implementado (caminho crítico do núcleo):
 *   Time → Calendar → Competition (→ Combat) → Consequence → Ranking →
 *   History → Save → avançar data.
 * Systems ainda ausentes (Training, Recovery, Athlete AI, Federation AI, News)
 * entram por extensão sem alterar este núcleo (ver TODO.md).
 */

import { eventsForDate, CALENDAR_STATUS } from "./calendar.js";
import { simulateCompetition, selectEntrants } from "./competitionSystem.js";
import { athletesInCategory } from "../core/world.js";
import { applyConsequences } from "./consequence.js";
import { applyCompetitionPoints, recomputeRankings } from "./ranking.js";
import { recordCompetitionHistory } from "./history.js";
import { COMPETITION_STATUS } from "../entities/competition.js";
import { addDays } from "../utils/dates.js";
import { RandomSystem } from "../services/random.js";

export class SimulationDirector {
  /**
   * @param {object} deps { world, random, idGen, eventBus, storage? }
   */
  constructor({ world, random, idGen, eventBus, storage = null }) {
    this.world = world;
    this.random = random || new RandomSystem(world.meta.seed);
    this.idGen = idGen;
    this.bus = eventBus;
    this.storage = storage;
  }

  _emit(type, payload) {
    if (!this.bus) return;
    this.bus.publish(type, payload, {
      worldDate: this.world.state.currentDate,
      source: "SimulationDirector",
    });
  }

  /** Processa um único dia seguindo a ordem oficial do pipeline. */
  advanceDay() {
    const world = this.world;
    const date = world.state.currentDate;
    this._emit("NewDayStarted", { date });

    // Calendar → competições do dia.
    const events = eventsForDate(world, date);
    for (const event of events) {
      const competition = world.competitions[event.competitionId];
      if (!competition) continue;
      this._runCompetition(competition);
      event.processed = true;
      event.status = CALENDAR_STATUS.DONE;
    }

    // Transição temporal: avança a data e os contadores ANTES de salvar, para
    // que o snapshot persistido reflita o estado completo do dia e a simulação
    // possa retomar limpa no dia seguinte. (Reordenação justificada em relação à
    // ordem nominal Save→Avançar do pipeline — ver DECISIONS.md.)
    world.state.currentDate = addDays(date, 1);
    world.state.processedDays += 1;
    if (this.random) world.rngState = this.random.getState();
    if (this.idGen) world.idState = this.idGen.getState();

    // Salvamento (Save System — última etapa obrigatória).
    if (this.storage) {
      this.storage.save("world", world);
      this._emit("WorldSaved", { date });
    }

    this._emit("DayFinished", { date });
    return { date, competitions: events.length };
  }

  /** Roda uma competição inteira e propaga as consequências. */
  _runCompetition(competition) {
    const world = this.world;
    competition.status = COMPETITION_STATUS.RUNNING;
    this._emit("CompetitionStarted", { competitionId: competition.id });

    const { byCategory, allMatches } = simulateCompetition(
      this.random,
      competition,
      (categoryId) =>
        selectEntrants(athletesInCategory(world, categoryId), competition.fieldSize),
      {
        onMatch: (match) =>
          this._emit("FightFinished", {
            competitionId: competition.id,
            categoryId: match.categoryId,
            winnerId: match.winnerId,
          }),
      }
    );

    // Ranking: credita pontos no ledger e recalcula pontos efetivos/posições
    // (antes das estatísticas de país, que somam os pontos efetivos).
    applyCompetitionPoints(world, competition, byCategory);
    recomputeRankings(world, competition.date);
    // Consequências: estatísticas de atletas e países.
    applyConsequences(world, competition, byCategory, allMatches);
    // Histórico permanente.
    recordCompetitionHistory(world, competition, byCategory);

    competition.status = COMPETITION_STATUS.FINISHED;
    this._emit("CompetitionFinished", { competitionId: competition.id });
    this._emit("RankingUpdated", { date: competition.date });
  }

  /** Avança vários dias em sequência (processa um dia por vez). */
  advanceDays(days) {
    const summary = [];
    for (let i = 0; i < days; i++) summary.push(this.advanceDay());
    return summary;
  }

  /**
   * Avança até (e incluindo) a data alvo, processando um dia por vez.
   * @param {string} targetDate  ISO-8601
   * @returns {number} dias processados.
   */
  advanceUntil(targetDate) {
    let processed = 0;
    while (this.world.state.currentDate <= targetDate) {
      this.advanceDay();
      processed += 1;
    }
    return processed;
  }
}
