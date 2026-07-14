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
import { applyCompetitionPoints, recomputeRankings, captureYearStartRanks } from "./ranking.js";
import { recordCompetitionHistory } from "./history.js";
import { processRecovery } from "./recovery.js";
import { applyCompetitionInjuries } from "./injuries.js";
import { newsInjury, newsRecovery, newsCallup } from "./news.js";
import {
  rivalryIntensity,
  rivalryLevel,
  updateRivalriesFromCompetition,
  pruneRivalries,
} from "./rivalry.js";
import {
  isPresidentsCup,
  isContinentalChampionship,
  wildcardEntrantsFor,
  grantPresidentsCupWildcards,
  consumeWildcards,
} from "./wildcards.js";
import {
  isSelective,
  selectiveParticipants,
  selectiveFightFn,
  assignNationalTeam,
  promoteReserveOnInjury,
} from "./nationalTeams.js";
import {
  isGrandSlamChallenge,
  isGrandSlamFinals,
  resolveGrandSlamFinalists,
  grantGrandSlamChallengeQualifiers,
  applyGrandSlamMerit,
} from "./grandSlam.js";
import {
  isOlympics,
  isOlympicRankingQual,
  isOlympicGrandSlamQual,
  isOlympicContinentalQual,
  isOlympicFinalCheck,
  runOlympicRankingQual,
  runOlympicGrandSlamQual,
  continentalQualParticipants,
  assignContinentalQuotas,
  finalizeOlympicField,
  runOlympicInjuryReplacement,
  findOlympicsGames,
  resolveOlympicEntrants,
  olympicBlackoutIds,
} from "./olympics.js";
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

    // Salvamento (Save System — última etapa obrigatória). Não fatal: se o
    // backend recusar (ex.: cota do localStorage), a simulação segue em memória.
    if (this.storage) {
      const saved = this.storage.save("world", world);
      this._emit(saved ? "WorldSaved" : "WorldSaveFailed", { date });
    }

    this._emit("DayFinished", { date });
    return { date, competitions: events.length };
  }

  /** Roda uma competição inteira e propaga as consequências. */
  _runCompetition(competition) {
    const world = this.world;
    competition.status = COMPETITION_STATUS.RUNNING;
    this._emit("CompetitionStarted", { competitionId: competition.id });

    // Classificação olímpica "de papel" (sem lutas): trava vagas e encerra.
    if (isOlympicRankingQual(competition)) {
      runOlympicRankingQual(world, competition);
      competition.status = COMPETITION_STATUS.FINISHED;
      this._emit("CompetitionFinished", { competitionId: competition.id });
      return;
    }
    if (isOlympicGrandSlamQual(competition)) {
      runOlympicGrandSlamQual(world, competition);
      competition.status = COMPETITION_STATUS.FINISHED;
      this._emit("CompetitionFinished", { competitionId: competition.id });
      return;
    }
    // Confirmação Olímpica (15 dias antes): fecha o campo (país-sede + Comissão
    // Tripartite) e faz a substituição de classificados lesionados.
    if (isOlympicFinalCheck(competition)) {
      finalizeOlympicField(world, competition, this.random);
      for (const ev of runOlympicInjuryReplacement(world, competition)) {
        this._emit(ev.type === "forfeit" ? "OlympicForfeit" : "OlympicReplacement", {
          athleteId: ev.athleteId,
          categoryId: ev.categoryId,
        });
      }
      const games = findOlympicsGames(world, competition.olympicYear);
      if (games) games.quotasFinalized = true;
      competition.status = COMPETITION_STATUS.FINISHED;
      this._emit("CompetitionFinished", { competitionId: competition.id });
      return;
    }

    // Jogos Olímpicos: garante o campo fechado (caso a Confirmação não tenha
    // rodado — ex.: jogo iniciado após 15/jul) antes de montar as chaves.
    if (isOlympics(competition) && !competition.quotasFinalized) {
      finalizeOlympicField(world, competition, this.random);
    }

    // Continental: resolve os agraciados por wildcard da President's Cup ANTES
    // de montar o campo, para o Participation incluí-los (além do 1 por país) e
    // a UI marcar a vaga. Determinístico (baseado no ranking vigente).
    if (isContinentalChampionship(competition)) {
      competition.wildcards = {};
      for (const categoryId of competition.categoryIds) {
        const ids = wildcardEntrantsFor(world, competition, categoryId);
        if (ids.length) competition.wildcards[categoryId] = ids;
      }
    }

    // Campo por tipo de evento: Seletiva (país), Grand Slam Finals (10 válidos),
    // Jogos (16 classificados), torneio continental olímpico (continente, não
    // classificados, 1/país) ou seleção normal.
    // Blackout olímpico: nos 15 dias antes dos Jogos (após a verificação de
    // lesões), os classificados não disputam mais nada — evita lesão sem tempo
    // de substituição.
    const blackout = olympicBlackoutIds(world, competition);
    const participantsFor = isSelective(competition)
      ? (categoryId) => selectiveParticipants(world, competition, categoryId)
      : isGrandSlamFinals(competition)
      ? (categoryId) => resolveGrandSlamFinalists(world, competition, categoryId)
      : isOlympics(competition)
      ? (categoryId) => resolveOlympicEntrants(world, competition, categoryId)
      : isOlympicContinentalQual(competition)
      ? (categoryId) => continentalQualParticipants(world, competition, categoryId)
      : (categoryId) => {
          const field = selectParticipants(world, competition, categoryId, this.random);
          return blackout ? field.filter((a) => !blackout.has(a.id)) : field;
        };

    const onMatch = (match) =>
      this._emit("FightFinished", {
        competitionId: competition.id,
        categoryId: match.categoryId,
        winnerId: match.winnerId,
      });
    // Rivalidade (0..1) do par na data do evento → afeta a luta. Vale também nas
    // seletivas (rivalidades entre compatriotas contam).
    const rivalryLookup = (aId, bId) =>
      rivalryLevel(rivalryIntensity(world, aId, bId, competition.date));
    // Seletiva: reduz as zebras — melhor de N lutas por confronto e SEM a forma
    // do dia (peneira interna). Evento oficial: variância normal (forma).
    const combatOpts = isSelective(competition)
      ? { onMatch, rivalryLookup, fightFn: selectiveFightFn(), applyForm: false }
      : { onMatch, rivalryLookup };
    // Grand Slam: disputa de 3º lugar (bronze único). As Finais usam o seeding
    // já resolvido (cabeças-de-chave forçados), então não reordenam por ranking.
    if (isGrandSlamChallenge(competition) || isGrandSlamFinals(competition)) {
      combatOpts.thirdPlaceMatch = true;
    }
    if (isGrandSlamFinals(competition)) combatOpts.preseeded = true;
    // Jogos Olímpicos: repescagem (dois bronzes por chaves cruzadas).
    if (isOlympics(competition)) combatOpts.repechage = true;

    const { byCategory, allMatches } = simulateCompetition(
      this.random,
      competition,
      participantsFor,
      combatOpts
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

    if (isSelective(competition)) {
      // Seletiva Nacional: NÃO pontua no ranking, não conta medalhas/estatísticas
      // nem histórico. Guarda a classificação (para consulta) e define a seleção.
      for (const [categoryId, placements] of Object.entries(byCategory)) {
        competition.results[categoryId] = placements;
      }
      assignNationalTeam(world, competition, byCategory);
      // Rivalidades TAMBÉM contam nas seletivas: finais/semis nacionais constroem
      // rivalidades entre compatriotas (que só viram rivalidade com 3+ encontros).
      updateRivalriesFromCompetition(world, competition, allMatches);
      pruneRivalries(world, competition.date);
      competition.status = COMPETITION_STATUS.FINISHED;
      this._emit("CompetitionFinished", { competitionId: competition.id });
      return;
    }

    if (isGrandSlamFinals(competition)) {
      // Grand Slam Finals: NÃO pontuam no ranking normal — alimentam o Ranking de
      // Mérito Grand Slam (separado). Medalhas/estatísticas/histórico, lesões e
      // rivalidades seguem como em qualquer evento oficial.
      applyGrandSlamMerit(world, competition, byCategory);
      applyConsequences(world, competition, byCategory, allMatches);
      for (const inj of applyCompetitionInjuries(world, competition, allMatches, this.random, competition.date)) {
        newsInjury(world, competition.date, inj.athleteId, inj.severity, inj.until);
        this._emit("AthleteInjured", { athleteId: inj.athleteId, severity: inj.severity, until: inj.until });
        const promoted = promoteReserveOnInjury(world, inj.athleteId);
        if (promoted) newsCallup(world, competition.date, promoted, inj.athleteId);
      }
      updateRivalriesFromCompetition(world, competition, allMatches);
      pruneRivalries(world, competition.date);
      recordCompetitionHistory(world, competition, byCategory);
      competition.status = COMPETITION_STATUS.FINISHED;
      this._emit("CompetitionFinished", { competitionId: competition.id });
      return;
    }

    if (isOlympicContinentalQual(competition)) {
      // Torneio Classificatório Continental: NÃO pontua no ranking nem conta
      // medalhas/histórico — existe só para conceder vagas olímpicas aos
      // finalistas. Guarda os resultados (visíveis na tela) e as rivalidades.
      for (const [categoryId, placements] of Object.entries(byCategory)) {
        competition.results[categoryId] = placements;
      }
      assignContinentalQuotas(world, competition, byCategory);
      updateRivalriesFromCompetition(world, competition, allMatches);
      pruneRivalries(world, competition.date);
      competition.status = COMPETITION_STATUS.FINISHED;
      this._emit("CompetitionFinished", { competitionId: competition.id });
      return;
    }

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
      // Se um titular da seleção se lesiona, convoca um reserva (ele entra).
      const promoted = promoteReserveOnInjury(world, inj.athleteId);
      if (promoted) newsCallup(world, competition.date, promoted, inj.athleteId);
    }
    // Rivalidades: atualiza a partir das lutas decisivas (finais/semis) e poda
    // as que esfriaram. Feito APÓS as lutas, então o próximo evento já usa o
    // estado novo.
    updateRivalriesFromCompetition(world, competition, allMatches);
    pruneRivalries(world, competition.date);
    // Wildcards da President's Cup: concede as vagas ao final da Copa do
    // Presidente; consome/expira as pendentes ao rodar o continental.
    if (isPresidentsCup(competition)) {
      grantPresidentsCupWildcards(world, competition, byCategory, allMatches);
    }
    if (isContinentalChampionship(competition)) {
      consumeWildcards(world, competition);
    }
    // Grand Slam Challenge (seletiva aberta): resolve os 2 qualificados por peso
    // (campeão + próximo de outro país) para as Finais lerem.
    if (isGrandSlamChallenge(competition)) {
      grantGrandSlamChallengeQualifiers(world, competition, byCategory);
    }
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
    // Em janeiro, guarda o ranking de início do ano (para a tela de fim de ano).
    if (date.slice(5, 7) === "01") captureYearStartRanks(this.world);
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
