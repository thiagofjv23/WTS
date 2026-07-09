/**
 * Entidade Country (dados apenas).
 * Baseado em DataArchitecture.md.
 *
 * Um país não possui desempenho próprio: suas estatísticas são a soma dos
 * resultados de seus atletas (SimulationRules §6), recalculadas pela engine.
 */

export function emptyCountryStatistics() {
  return {
    golds: 0,
    silvers: 0,
    bronzes: 0,
    rankingPoints: 0,
  };
}

/**
 * @param {object} data
 * @param {string} data.id
 * @param {string} data.name
 * @param {string} data.code       ISO-2 (ex.: "KR")
 * @param {string} [data.tier]     "1" | "2" | "3" (força relativa no seed)
 */
export function createCountry(data) {
  const { id, name, code, tier = "3" } = data;
  if (!id) throw new Error("Country: id é obrigatório.");
  if (!code) throw new Error("Country: code é obrigatório.");
  return {
    id,
    name,
    code,
    tier,
    athleteIds: [],
    statistics: emptyCountryStatistics(),
    schemaVersion: 1,
  };
}
