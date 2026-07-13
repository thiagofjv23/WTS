/**
 * Entidade Competition (dados apenas) + catálogo de G-Ranks.
 * Baseado em DataArchitecture.md e taekwondo-ranking.md §1.
 */

/**
 * Peso das competições (G-Rank) → pontos do campeão.
 * Regra geral da World Taekwondo: campeão de um G-n recebe n×10 pontos
 * (G-1=10, G-2=20, G-4=40, G-6=60, G-8=80, G-10=100, G-20=200). O calendário
 * real de 2026 usa graus além dos listados no taekwondo-ranking.md (G-6 Grand
 * Prix Series, G-10 Grand Prix Final) — daí a fórmula geral. Ver DECISIONS.md.
 */
export const G_RANK_LABELS = {
  "G-1": "Aberto / Continental menor",
  "G-2": "Grand Prix / Aberto maior",
  "G-4": "Campeonato Continental",
  "G-6": "Grand Prix Series",
  "G-8": "Mundial / Copa por Equipes",
  "G-10": "Grand Prix Final",
  "G-12": "Grand Slam Champions Series",
  "G-20": "Jogos Olímpicos",
};

/** Valida um G-Rank no formato "G-n". */
export function isValidGRank(gRank) {
  return /^G-\d+$/.test(gRank);
}

/** Pontos do campeão para um G-Rank ("G-n" → n×10). */
export function championPointsFor(gRank) {
  const m = /^G-(\d+)$/.exec(gRank);
  if (!m) throw new Error(`G-Rank inválido: ${gRank}`);
  return Number(m[1]) * 10;
}

/** Compatibilidade: catálogo dos graus mais comuns. */
export const G_RANKS = Object.fromEntries(
  Object.keys(G_RANK_LABELS).map((g) => [
    g,
    { id: g, championPoints: championPointsFor(g), label: G_RANK_LABELS[g] },
  ])
);

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
 * @param {number} [data.fieldSize]  máximo de inscritos por categoria (por
 *   ranking); null = todos os atletas ativos da categoria.
 */
export function createCompetition(data) {
  const {
    id, name, gRank, date, categoryIds, location = null, fieldSize = 32,
    type = "official", selectiveCountry = null,
  } = data;
  if (!id) throw new Error("Competition: id é obrigatório.");
  if (!isValidGRank(gRank)) throw new Error(`Competition: gRank inválido "${gRank}".`);
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
    fieldSize,
    // type "official" (padrão) ou "selective" (Seletiva Nacional — não pontua no
    // ranking, define a Seleção Nacional). selectiveCountry = código IOC do país.
    type,
    selectiveCountry,
    status: COMPETITION_STATUS.SCHEDULED,
    results: {}, // categoryId → [{ athleteId, placement, medal }]
    schemaVersion: 1,
  };
}
