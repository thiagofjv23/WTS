/**
 * Grand Slam Champions Series.
 * Fonte: "Estrutura Competitiva e Dinâmica de Ranking do Taekwondo Mundial"
 * (o campeão do Grand Slam leva uma vaga olímpica — porta de entrada olímpica).
 *
 * Torneio anual, de FIM DE ANO e por CONVITE: só os melhores do ranking (top 16
 * por categoria) disputam, em eliminação simples. É o evento mais prestigiado do
 * calendário (grau alto), acima do Grand Prix Final. Combate normal (forma +
 * rivalidade). Ver docs/GRAND_SLAM.md.
 */

import { createCompetition } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

/** Grau do Grand Slam (campeão = 120 pts; acima do GP Final G-10). */
export const GRAND_SLAM_GRANK = "G-12";
/** Convidados por categoria (top N do ranking). */
export const GRAND_SLAM_FIELD = 16;
/** Local histórico do Grand Slam Champions Series. */
const GRAND_SLAM_LOCATION = "Wuxi, China";

/** É uma etapa do Grand Slam? */
export function isGrandSlam(competition) {
  return /grand slam/i.test(competition?.name || "");
}

/**
 * Cria e agenda o Grand Slam do ano (fim de dezembro, todas as categorias).
 * Convite = top 16 do ranking por categoria (a trava é aplicada por
 * eligibility.classifyEvent, que reconhece "grand slam" no nome).
 * @returns {object} a competição criada.
 */
export function scheduleGrandSlam(world, idGen, opts = {}) {
  const { year, categoryFilter = MEN_IDS } = opts;
  const comp = createCompetition({
    id: idGen.next("COMP"),
    name: `WT Grand Slam Champions Series ${year}`,
    gRank: GRAND_SLAM_GRANK,
    date: `${year}-12-12`,
    categoryIds: categoryFilter,
    location: GRAND_SLAM_LOCATION,
    fieldSize: GRAND_SLAM_FIELD,
  });
  scheduleCompetition(world, idGen, comp);
  return comp;
}
