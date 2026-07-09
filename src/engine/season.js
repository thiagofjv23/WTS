/**
 * Season Builder — monta um calendário anual a partir dos eventos REAIS.
 *
 * Os eventos vêm do ranking oficial (REAL_EVENTS, com G-Rank inferido). O
 * arquivo não traz datas exatas, então distribuímos os eventos ao longo da
 * temporada de forma determinística (ver DECISIONS.md/TODO.md).
 */

import { createCompetition } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { addDays } from "../utils/dates.js";
import { REAL_EVENTS } from "../database/realRoster.js";

const SEASON_DAYS = 330; // ~11 meses de janela de temporada
const DEFAULT_FIELD_SIZE = 32;

/**
 * Cria e agenda as competições de uma temporada.
 * @param {object} world
 * @param {object} idGen
 * @param {object} [opts]
 *   { startDate, events, fieldSize, categoryFilter }
 *   - categoryFilter: array de categoryIds válidas (restringe as categorias dos
 *     eventos ao escopo atual, ex.: só masculino).
 * @returns {Array} competições criadas (em ordem de data).
 */
export function buildSeasonCalendar(world, idGen, opts = {}) {
  const {
    startDate = world.state.currentDate,
    events = REAL_EVENTS,
    fieldSize = DEFAULT_FIELD_SIZE,
    categoryFilter = null,
  } = opts;

  // Filtra as categorias de cada evento ao escopo e descarta eventos vazios.
  const usable = events
    .map((ev) => ({
      ...ev,
      categoryIds: categoryFilter
        ? ev.categoryIds.filter((c) => categoryFilter.includes(c))
        : ev.categoryIds,
    }))
    .filter((ev) => ev.categoryIds.length > 0);

  const spacing = usable.length > 1 ? Math.floor(SEASON_DAYS / usable.length) : 0;
  const competitions = [];
  usable.forEach((ev, i) => {
    const date = addDays(startDate, 7 + i * spacing); // primeira ~1 semana após o início
    const comp = createCompetition({
      id: idGen.next("COMP"),
      name: ev.name,
      gRank: ev.gRank,
      date,
      categoryIds: ev.categoryIds,
      fieldSize,
    });
    scheduleCompetition(world, idGen, comp);
    competitions.push(comp);
  });

  return competitions;
}
