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
import { simulateCompetition } from "./competitionSystem.js";
import { selectParticipants } from "./participation.js";
import { applyConsequences, recomputeCountryStatistics } from "./consequence.js";
import { applyCompetitionPoints, recomputeRankings } from "./ranking.js";
import { recordCompetitionHistory } from "./history.js";
import { processRecovery } from "./recovery.js";
import { applyCompetitionInjuries } from "./injuries.js";
import { newsInjury, newsRecovery } from "./news.js";
import {
  rivalryIntensity,
  rivalryLevel,
  updateRivalriesFromCompetition,
  pruneRivalries,
} from "./rivalry.js";
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

    // Ranking oficial: materializado SÓ no dia 1 de cada mês (a WT publica o
    // ranking mensalmente). Entre atualizações, os pontos continuam sendo
    // creditados no ledger, mas as posições/pontos visíveis ficam congelados. O
    // decaimento (§5) é avaliado nesta data: um resultado troca de faixa assim
    // que o ranking do 1º do mês seguinte ao aniversário é calculado.
    this._monthlyRankingUpdate(date);

    // Recovery System (§4): reativa atletas que voltaram de lesão.
    for (const rec of processRecovery(world, date)) {
      newsRecovery(world, date, rec.athleteId);
      this._emit("AthleteRecovered", { athleteId: rec.athleteId });
    }

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
      (categoryId) => selectParticipants(world, competition, categoryId, this.random),
      {
        // Rivalidade (0..1) entre dois atletas na data do evento → afeta a luta.
        rivalryLookup: (aId, bId) =>
          rivalryLevel(rivalryIntensity(world, aId, bId, competition.date)),
        onMatch: (match) =>
          this._emit("FightFinished", {
            competitionId: competition.id,
            categoryId: match.categoryId,
            winnerId: match.winnerId,
          }),
      }
    );

    // Persiste as lutas (compacto) para consulta na interface. O ranking só é
    // recalculado no dia 1 de cada mês, então athlete.ranking.position é o
    // ranking oficial VIGENTE no início do campeonato — guardamos aRank/bRank
    // para exibir o chaveamento.
    const rankOf = (id) => world.athletes[id]?.ranking.position ?? null;
    competition.matches = allMatches.map((m) => {
      const rounds = m.rounds || [];
      const rwA = rounds.filter((r) => r.winner === m.athleteAId).length;
      const rwB = rounds.filter((r) => r.winner === m.athleteBId).length;
      return {
        categoryId: m.categoryId,
        round: m.round,
        aId: m.athleteAId,
        bId: m.athleteBId,
        winnerId: m.winnerId,
        score: [rwA, rwB],
        aRank: rankOf(m.athleteAId),
        bRank: rankOf(m.athleteBId),
        rivalry: m.rivalry || 0,
      };
    });

    // Ranking: credita os pontos no ledger (registro permanente). O ranking
    // materializado (posições/pontos visíveis) NÃO muda aqui — é recalculado no
    // dia 1 de cada mês (ver _monthlyRankingUpdate).
    applyCompetitionPoints(world, competition, byCategory);
    // Consequências: estatísticas de atletas e países.
    applyConsequences(world, competition, byCategory, allMatches);
    // Lesões (§9): desgaste + risco de lesão para os participantes.
    for (const inj of applyCompetitionInjuries(world, competition, allMatches, this.random, competition.date)) {
      newsInjury(world, competition.date, inj.athleteId, inj.severity, inj.until);
      this._emit("AthleteInjured", {
        athleteId: inj.athleteId,
        severity: inj.severity,
        until: inj.until,
      });
    }
    // Rivalidades: atualiza a partir das lutas decisivas (finais/semis) e poda
    // as que esfriaram. Feito APÓS as lutas, então o próximo evento já usa o
    // estado novo.
    updateRivalriesFromCompetition(world, competition, allMatches);
    pruneRivalries(world, competition.date);
    // Histórico permanente.
    recordCompetitionHistory(world, competition, byCategory);

    competition.status = COMPETITION_STATUS.FINISHED;
    this._emit("CompetitionFinished", { competitionId: competition.id });
  }

  /**
   * Recalcula o ranking materializado (pontos efetivos + posições) e as
   * estatísticas nacionais — apenas no dia 1 de cada mês. O decaimento (§5) é
   * avaliado nesta data. Fora do dia 1 é um no-op barato.
   */
  _monthlyRankingUpdate(date) {
    if (date.slice(8, 10) !== "01") return;
    recomputeRankings(this.world, date);
    recomputeCountryStatistics(this.world);
    this._emit("RankingUpdated", { date });
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
