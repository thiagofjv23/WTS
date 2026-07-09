/**
 * Calendar System — o calendário é a fonte da verdade (SimulationRules §1).
 * A engine só simula o que estiver agendado para a data atual.
 */

export const CALENDAR_STATUS = {
  PENDING: "pendente",
  DONE: "concluido",
};

/** Cria um evento de calendário ligando uma competição a uma data. */
export function createCalendarEvent(id, date, competitionId) {
  return {
    id,
    date,
    competitionId,
    status: CALENDAR_STATUS.PENDING,
    processed: false,
  };
}

/** Agenda uma competição no mundo (competição + evento de calendário). */
export function scheduleCompetition(world, idGen, competition) {
  world.competitions[competition.id] = competition;
  const event = createCalendarEvent(idGen.next("CAL"), competition.date, competition.id);
  world.calendar.push(event);
  return event;
}

/** Retorna os eventos pendentes agendados para a data informada. */
export function eventsForDate(world, date) {
  return world.calendar.filter((e) => e.date === date && !e.processed);
}
