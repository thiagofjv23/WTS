/**
 * Consequence System — atualiza estatísticas após as competições
 * (simulation_director.md §9 e SimulationPipeline etapas 5–6).
 *
 * Atletas: vitórias/derrotas/lutas, medalhas, participações, histórico pessoal.
 * Países: estatísticas recalculadas como soma dos atletas (SimulationRules §6).
 */

/** Aplica consequências de uma competição às estatísticas dos atletas. */
export function applyConsequences(world, competition, byCategory, allMatches) {
  // Vitórias/derrotas a partir das lutas.
  for (const match of allMatches) {
    const winner = world.athletes[match.winnerId];
    const loserId = match.winnerId === match.athleteAId ? match.athleteBId : match.athleteAId;
    const loser = world.athletes[loserId];
    if (winner) {
      winner.statistics.fights += 1;
      winner.statistics.wins += 1;
    }
    if (loser) {
      loser.statistics.fights += 1;
      loser.statistics.losses += 1;
    }
  }

  // Medalhas, participações e histórico a partir das colocações.
  for (const [categoryId, placements] of Object.entries(byCategory)) {
    for (const entry of placements) {
      const athlete = world.athletes[entry.athleteId];
      if (!athlete) continue;
      athlete.statistics.competitions += 1;
      if (entry.medal === "ouro") athlete.statistics.golds += 1;
      else if (entry.medal === "prata") athlete.statistics.silvers += 1;
      else if (entry.medal === "bronze") athlete.statistics.bronzes += 1;

      athlete.history.push({
        competitionId: competition.id,
        categoryId,
        date: competition.date,
        placement: entry.placement,
        medal: entry.medal,
        pointsEarned: entry.rankingPointsEarned ?? 0,
      });
    }
  }

  recomputeCountryStatistics(world);
}

/** Recalcula as estatísticas nacionais como soma dos atletas do país. */
export function recomputeCountryStatistics(world) {
  for (const country of Object.values(world.countries)) {
    const stats = { golds: 0, silvers: 0, bronzes: 0, rankingPoints: 0 };
    for (const id of country.athleteIds) {
      const a = world.athletes[id];
      if (!a) continue;
      stats.golds += a.statistics.golds;
      stats.silvers += a.statistics.silvers;
      stats.bronzes += a.statistics.bronzes;
      stats.rankingPoints += a.ranking.points;
    }
    stats.rankingPoints = Math.round(stats.rankingPoints * 100) / 100;
    country.statistics = stats;
  }
}
