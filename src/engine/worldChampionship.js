/**
 * Campeonato Mundial (World Taekwondo Championships).
 *
 * Referência: Mundial de 2025 (Wuxi). Formato: eliminação simples (melhor de 3
 * rounds), 1 atleta por país por categoria, aberto às federações do mundo todo.
 * É o evento de maior grau do calendário depois das Olimpíadas: **G-14**
 * (campeão = 140 pts). Bienal, em anos ÍMPARES a partir de 2027 (2027, 2029,
 * 2031, …), em julho, em Astana. Ver docs/WORLD_CHAMPIONSHIP.md.
 *
 * Obs.: o Mundial real tem 8 divisões de peso; a simulação usa as 4 categorias
 * olímpicas masculinas (mesmo escopo do resto do jogo).
 */

import { createCompetition } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

/** Grau do Mundial (campeão = 140 pts; abaixo só das Olimpíadas G-20). */
export const WORLDS_GRANK = "G-14";
/** Máximo de inscritos por categoria (melhores representantes nacionais). */
export const WORLDS_FIELD = 128;
/** 1ª edição na simulação; depois de 2 em 2 anos. */
export const WORLDS_FIRST_YEAR = 2027;
const WORLDS_DATE_MMDD = "07-18"; // julho
const WORLDS_LOCATION = "Astana, Kazakhstan";

/** O Mundial acontece a cada 2 anos, em anos ímpares a partir de 2027. */
export function isWorldsYear(year) {
  return year >= WORLDS_FIRST_YEAR && (year - WORLDS_FIRST_YEAR) % 2 === 0;
}

/** É um Campeonato Mundial? (só o Mundial usa o grau G-14). */
export function isWorldChampionship(competition) {
  return competition?.gRank === WORLDS_GRANK;
}

/**
 * Agenda o Mundial do ano, se for ano de Mundial (senão, no-op). 1 por país por
 * categoria (a trava é aplicada por eligibility.classifyEvent para o grau G-14).
 * @returns {object|null} a competição criada, ou null.
 */
export function scheduleWorldChampionship(world, idGen, opts = {}) {
  const { year, categoryFilter = MEN_IDS } = opts;
  if (!isWorldsYear(year)) return null;
  const comp = createCompetition({
    id: idGen.next("COMP"),
    name: `Campeonato Mundial de Taekwondo ${year}`,
    gRank: WORLDS_GRANK,
    date: `${year}-${WORLDS_DATE_MMDD}`,
    categoryIds: categoryFilter,
    location: WORLDS_LOCATION,
    fieldSize: WORLDS_FIELD,
  });
  scheduleCompetition(world, idGen, comp);
  return comp;
}
