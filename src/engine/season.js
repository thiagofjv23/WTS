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
 * Atualiza o ANO embutido no nome do evento ao clonar para outra temporada.
 * O calendário-base é de 2026 e muitos nomes trazem o ano ("Roma 2026 …",
 * "2026 U.S. Open", "Dutch Open 2026"); sem isso a edição de 2027 apareceria
 * como "…2026" com data de 2027 — o que confunde o observador (parecia que a
 * competição do ano anterior tinha ido para o ano seguinte). Ver DECISIONS.md.
 */
function shiftNameYear(name, baseYear, years) {
  if (!years) return name;
  return name.split(String(baseYear)).join(String(baseYear + years));
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
    if (!ev.date) {
      return { ev, date: addDays(startDate, 7 + noDateIndex++ * spacing) };
    }
    const baseYear = Number(ev.date.slice(0, 4));
    return {
      ev: { ...ev, name: shiftNameYear(ev.name, baseYear, yearOffset) },
      date: shiftYear(ev.date, yearOffset),
    };
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
