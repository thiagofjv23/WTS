/**
 * History System — registro permanente de campeões e medalhistas.
 * SimulationRules §8: o histórico é acumulativo e nunca é sobrescrito.
 */

/** Registra o histórico de uma competição no mundo (append-only). */
export function recordCompetitionHistory(world, competition, byCategory) {
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    const medalists = placements.filter((p) => p.medal);
    world.history.push({
      type: "competition",
      competitionId: competition.id,
      competitionName: competition.name,
      gRank: competition.gRank,
      categoryId,
      date: competition.date,
      season: Number(competition.date.slice(0, 4)),
      champion: placements.find((p) => p.placement === 1)?.athleteId ?? null,
      medalists: medalists.map((p) => ({
        athleteId: p.athleteId,
        placement: p.placement,
        medal: p.medal,
      })),
    });
  }
}
