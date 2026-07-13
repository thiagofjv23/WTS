/**
 * Seleções Nacionais e Seletivas.
 *
 * Em janeiro, países com MAIS DE 20 atletas no total realizam uma Seletiva
 * Nacional (por categoria, entre os atletas do próprio país). Em cada categoria:
 *  - os DOIS finalistas (campeão e vice) entram na Seleção Nacional (titulares);
 *  - os DOIS terceiros colocados ficam como RESERVAS (entram na seleção quando um
 *    titular se lesiona).
 *
 * A seletiva NÃO pontua no ranking nem conta medalhas — é interna. Serve para
 * definir a seleção, que é destacada em todas as telas.
 *
 * Determinístico. Ver DECISIONS.md e docs/NATIONAL_TEAMS.md.
 */

import { createCompetition } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { athletesInCategory } from "../core/world.js";
import { combatRating } from "./combat/probability.js";
import { simulateFight } from "./combat/fightManager.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";
import { yearOf } from "../utils/dates.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

/** Limiar de atletas para um país realizar seletiva (MAIS de 20). */
export const SELECTIVE_MIN_ATHLETES = 20;
/**
 * A seletiva é resolvida em "melhor de N" lutas por confronto: reduz as zebras
 * (o mais forte prevalece com mais confiabilidade) sem trocar o modelo de
 * combate nem perder o placar das lutas. Calibrado em teste: com melhor-de-5 o
 * nº 1 do país entra na seleção ~93% das vezes (era ~85% com uma luta só).
 */
export const SELECTIVE_BEST_OF = 5;

/**
 * fightFn "melhor de N" para as seletivas: roda a luta N vezes e o vencedor é a
 * maioria. Devolve uma luta representativa (a 1ª vencida pelo vencedor) para
 * exibir um placar coerente.
 */
export function selectiveFightFn(bestOf = SELECTIVE_BEST_OF) {
  return (random, a, b, ctx) => {
    let winsA = 0;
    const results = [];
    for (let i = 0; i < bestOf; i++) {
      const res = simulateFight(random, a, b, ctx);
      if (res.winnerId === a.id) winsA += 1;
      results.push(res);
    }
    const winnerId = winsA > bestOf / 2 ? a.id : b.id;
    const rep = results.find((r) => r.winnerId === winnerId) || results[results.length - 1];
    return { ...rep, winnerId };
  };
}

/** É uma Seletiva Nacional? */
export function isSelective(competition) {
  return competition?.type === "selective";
}

/** Países elegíveis a seletiva (mais de 20 atletas no total). */
export function qualifyingCountries(world) {
  return Object.values(world.countries).filter(
    (c) => c.athleteIds.length > SELECTIVE_MIN_ATHLETES
  );
}

function byRanking(a, b) {
  if (b.ranking.points !== a.ranking.points) return b.ranking.points - a.ranking.points;
  return combatRating(b.attributes) - combatRating(a.attributes);
}

/**
 * Atletas ativos de um país numa categoria (inscritos da seletiva), ordenados
 * por ranking (para o seeding do chaveamento — os melhores ficam em lados
 * opostos e recebem bye quando o campo não é potência de dois). SEM teto: a
 * seletiva é a exceção que pode ter mais de 32 (ex.: KOR -68 tem 57).
 */
export function selectiveParticipants(world, competition, categoryId) {
  const code = competition.selectiveCountry;
  const pool = athletesInCategory(world, categoryId).filter(
    (a) => world.countries[a.countryId]?.code === code
  );
  pool.sort(byRanking);
  return pool;
}

/**
 * Cria e agenda as Seletivas Nacionais de janeiro do ano informado, espalhadas
 * pelas datas do mês. Uma competição por país elegível (com as categorias em que
 * o país tem atletas).
 * @returns {Array} competições criadas.
 */
export function scheduleNationalSelectives(world, idGen, opts = {}) {
  const { year = yearOf(world.state.currentDate), categoryFilter = MEN_IDS } = opts;
  const countries = qualifyingCountries(world).sort(
    (a, b) => b.athleteIds.length - a.athleteIds.length
  );
  const created = [];
  countries.forEach((country, i) => {
    // Categorias em que o país tem ao menos 1 atleta.
    const cats = categoryFilter.filter((cat) =>
      athletesInCategory(world, cat).some((a) => world.countries[a.countryId]?.code === country.code)
    );
    if (!cats.length) return;
    // Espalha pelos dias 3..29 de janeiro (cicla se houver muitos países).
    const day = 3 + (i % 27);
    const date = `${year}-01-${String(day).padStart(2, "0")}`;
    const comp = createCompetition({
      id: idGen.next("COMP"),
      name: `Seletiva Nacional — ${country.name}`,
      gRank: "G-1", // dummy: seletiva não pontua (o Director trata à parte)
      date,
      categoryIds: cats,
      location: country.name,
      fieldSize: null, // sem teto: a seletiva pode ter mais de 32 (exceção)
      type: "selective",
      selectiveCountry: country.code,
    });
    scheduleCompetition(world, idGen, comp);
    created.push(comp);
  });
  return created;
}

/**
 * Define a Seleção Nacional a partir dos resultados da seletiva: finalistas
 * (1º/2º) = titulares; terceiros (2× 3º) = reservas. Limpa a designação do ano
 * anterior daquele país/categoria.
 */
export function assignNationalTeam(world, competition, byCategory) {
  const code = competition.selectiveCountry;
  if (!code) return;
  const year = yearOf(competition.date);
  const team = (world.nationalTeams[code] ||= {});
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    const sorted = [...placements].sort((a, b) => a.placement - b.placement);
    const titulares = sorted.filter((p) => p.placement <= 2).map((p) => p.athleteId);
    const reservas = sorted.filter((p) => p.placement === 3).map((p) => p.athleteId).slice(0, 2);
    // Limpa a seleção anterior desse país/categoria.
    const prev = team[categoryId];
    if (prev) {
      for (const id of [...prev.titulares, ...prev.reservas]) {
        if (world.athletes[id]) world.athletes[id].nationalTeam = null;
      }
    }
    for (const id of titulares) if (world.athletes[id]) world.athletes[id].nationalTeam = "titular";
    for (const id of reservas) if (world.athletes[id]) world.athletes[id].nationalTeam = "reserva";
    team[categoryId] = { titulares, reservas, year, competitionId: competition.id };
  }
}

/**
 * Quando um TITULAR se lesiona, convoca o 1º reserva ativo do mesmo país/
 * categoria (ele "entra" na seleção, virando titular). Idempotente.
 * @returns {string|null} id do reserva promovido, se houve.
 */
export function promoteReserveOnInjury(world, injuredId) {
  const a = world.athletes[injuredId];
  if (!a || a.nationalTeam !== "titular") return null;
  const code = world.countries[a.countryId]?.code;
  const team = world.nationalTeams?.[code]?.[a.weightCategoryId];
  if (!team) return null;
  const reserveId = team.reservas.find((id) => {
    const r = world.athletes[id];
    return r && r.status === "ativo" && r.nationalTeam === "reserva";
  });
  if (!reserveId) return null;
  world.athletes[reserveId].nationalTeam = "titular";
  return reserveId;
}
