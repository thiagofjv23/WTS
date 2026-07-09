/**
 * Season Builder — monta o calendário de uma temporada a partir de uma lista de
 * eventos com datas.
 *
 * Fonte padrão: CALENDAR_2026 (calendário oficial WT 2026, Kyorugi/Senior). Para
 * temporadas seguintes, deslocamos o ano (`yearOffset`), repetindo a estrutura
 * anual do calendário. Eventos sem data explícita são distribuídos pela janela.
 */

import { createCompetition } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { addDays } from "../utils/dates.js";
import { CALENDAR_2026 } from "../database/calendar2026.js";

const SEASON_DAYS = 330;
const DEFAULT_FIELD_SIZE = 32;

/** Desloca o ano de uma data ISO em `years`. */
function shiftYear(isoDate, years) {
  const [y, rest] = [isoDate.slice(0, 4), isoDate.slice(4)];
  return `${Number(y) + years}${rest}`;
}

/**
 * Cria e agenda as competições de uma temporada.
 * @param {object} world
 * @param {object} idGen
 * @param {object} [opts]
 *   { events, yearOffset, startDate, fieldSize, categoryFilter }
 *   - events: lista { name, gRank, date?, categoryIds } (padrão CALENDAR_2026)
 *   - yearOffset: anos a somar às datas do calendário (temporadas futuras)
 *   - startDate: base para eventos SEM data (distribuição)
 *   - categoryFilter: restringe as categorias ao escopo atual
 * @returns {Array} competições criadas (em ordem de data).
 */
export function buildSeasonCalendar(world, idGen, opts = {}) {
  const {
    events = CALENDAR_2026,
    yearOffset = 0,
    startDate = world.state.currentDate,
    fieldSize = DEFAULT_FIELD_SIZE,
    categoryFilter = null,
  } = opts;

  const usable = events
    .map((ev) => ({
      ...ev,
      categoryIds: categoryFilter
        ? ev.categoryIds.filter((c) => categoryFilter.includes(c))
        : ev.categoryIds,
    }))
    .filter((ev) => ev.categoryIds.length > 0);

  const withoutDate = usable.filter((e) => !e.date);
  const spacing = withoutDate.length > 1 ? Math.floor(SEASON_DAYS / withoutDate.length) : 0;
  let noDateIndex = 0;

  const competitions = usable.map((ev) => {
    const date = ev.date
      ? shiftYear(ev.date, yearOffset)
      : addDays(startDate, 7 + noDateIndex++ * spacing);
    return { ev, date };
  });

  competitions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const created = [];
  for (const { ev, date } of competitions) {
    const comp = createCompetition({
      id: idGen.next("COMP"),
      name: ev.name,
      gRank: ev.gRank,
      date,
      categoryIds: ev.categoryIds,
      location: ev.location ?? null,
      fieldSize,
    });
    scheduleCompetition(world, idGen, comp);
    created.push(comp);
  }
  return created;
}
