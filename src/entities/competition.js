/**
 * Entidade Competition (dados apenas) + catálogo de G-Ranks.
 * Baseado em DataArchitecture.md e taekwondo-ranking.md §1.
 */

/** Peso das competições (G-Rank) → pontos do campeão. taekwondo-ranking.md §1. */
export const G_RANKS = {
  "G-1": { id: "G-1", championPoints: 10, label: "Aberto/Continental" },
  "G-2": { id: "G-2", championPoints: 20, label: "Grand Prix" },
  "G-4": { id: "G-4", championPoints: 40, label: "Final do Grand Prix" },
  "G-8": { id: "G-8", championPoints: 80, label: "Campeonato Mundial" },
  "G-20": { id: "G-20", championPoints: 200, label: "Jogos Olímpicos" },
};

export const COMPETITION_STATUS = {
  SCHEDULED: "agendada",
  RUNNING: "em_andamento",
  FINISHED: "concluida",
};

/**
 * @param {object} data
 * @param {string} data.id
 * @param {string} data.name
 * @param {string} data.gRank        chave de G_RANKS (ex.: "G-1")
 * @param {string} data.date         ISO-8601
 * @param {string[]} data.categoryIds categorias disputadas
 * @param {string} [data.location]
 */
export function createCompetition(data) {
  const { id, name, gRank, date, categoryIds, location = null } = data;
  if (!id) throw new Error("Competition: id é obrigatório.");
  if (!G_RANKS[gRank]) throw new Error(`Competition: gRank inválido "${gRank}".`);
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw new Error("Competition: categoryIds é obrigatório.");
  }
  return {
    id,
    name,
    gRank,
    date,
    location,
    categoryIds,
    status: COMPETITION_STATUS.SCHEDULED,
    results: {}, // categoryId → [{ athleteId, placement, medal }]
    schemaVersion: 1,
  };
}
