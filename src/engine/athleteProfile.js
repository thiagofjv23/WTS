/**
 * Perfil do atleta e decisão de calendário para Opens (G-1/G-2).
 *
 * O perfil vem da POSIÇÃO no ranking (não é guardado no atleta) e dita a urgência
 * do atleta em farmar pontos em Opens, junto com a tolerância a viagem:
 *
 *   Perfil       Ranking    Urgência em Opens (G-1/G-2)
 *   Elite        1º–5º      baixíssima (aquecimento; foco em GP/Mundial/Olimpíada)
 *   Agressivo    6º–32º     altíssima (farma até bater o teto de 40)
 *   Escalador    33º–100º   alta, mas limitado pela geografia
 *   Local        101º+      média — só disputa na sua faixa continental
 *
 * A decisão usa Score = PtsDoTorneio − DistancePenalty; o atleta prefere o maior
 * Score, mas a FORMA do dia espalha quem entra em cada evento (evita que todos
 * corram aos primeiros Opens do ano). Ver docs/ATHLETE_PROFILE.md.
 */

/** Teto anual de pontos de Opens (G-1/G-2) — espelha ranking.G12_ANNUAL_CAP. */
export const OPEN_POINTS_CAP = 40;

export const AthleteProfile = {
  ELITE: "elite",
  AGGRESSIVE: "aggressive",
  CLIMBER: "climber",
  LOCAL: "local",
};

/** Perfil a partir da posição no ranking (sem posição = Local). */
export function profileForRank(position) {
  if (position == null) return AthleteProfile.LOCAL;
  if (position <= 5) return AthleteProfile.ELITE;
  if (position <= 32) return AthleteProfile.AGGRESSIVE;
  if (position <= 100) return AthleteProfile.CLIMBER;
  return AthleteProfile.LOCAL;
}

/**
 * Parâmetros por perfil:
 *  - quarterQuota: máximo de Opens por TRIMESTRE;
 *  - baseInterest: propensão-base a entrar num Open elegível;
 *  - penaltyPerLevel: penalidade por nível de distância continental (ver matriz).
 * Calibração: Local praticamente não cruza continente (100/nível); Agressivo/
 * Escalador conseguem ir a um continente vizinho quando precisam de pontos.
 */
export const PROFILE_PARAMS = {
  [AthleteProfile.ELITE]: { quarterQuota: 1, baseInterest: 0.15, penaltyPerLevel: 14 },
  [AthleteProfile.AGGRESSIVE]: { quarterQuota: 4, baseInterest: 0.9, penaltyPerLevel: 5 },
  [AthleteProfile.CLIMBER]: { quarterQuota: 3, baseInterest: 0.7, penaltyPerLevel: 8 },
  [AthleteProfile.LOCAL]: { quarterQuota: 2, baseInterest: 0.5, penaltyPerLevel: 100 },
};

/**
 * Distância entre continentes (0 mesmo, 1 vizinho, 2 médio, 3 longe).
 * PAM (Américas) é isolada; Ásia↔América e Oceania↔Europa são os extremos.
 */
const CONTINENT_DISTANCE = {
  EUR: { EUR: 0, ASI: 1, AFR: 1, PAM: 2, OCE: 3 },
  ASI: { ASI: 0, EUR: 1, AFR: 1, OCE: 1, PAM: 3 },
  AFR: { AFR: 0, EUR: 1, ASI: 1, PAM: 3, OCE: 3 },
  PAM: { PAM: 0, EUR: 2, ASI: 3, AFR: 3, OCE: 3 },
  OCE: { OCE: 0, ASI: 1, EUR: 3, AFR: 3, PAM: 3 },
};

/** Nível de distância entre dois continentes (desconhecido = 0, tratado como local). */
export function continentDistance(a, b) {
  if (!a || !b) return 0;
  return CONTINENT_DISTANCE[a]?.[b] ?? 3;
}

/** Penalidade de distância para um perfil (região do atleta × região do torneio). */
export function distancePenalty(profile, athleteContinent, tournamentContinent) {
  const level = continentDistance(athleteContinent, tournamentContinent);
  return level * (PROFILE_PARAMS[profile]?.penaltyPerLevel ?? 100);
}

/** Score de um Open: pontos do torneio menos a penalidade de distância. */
export function openScore(profile, tournamentPts, athleteContinent, tournamentContinent) {
  return tournamentPts - distancePenalty(profile, athleteContinent, tournamentContinent);
}

// ---- Rastreio anual/trimestral de Opens (no próprio atleta) -------------------

/** Chave de trimestre "AAAA-Qn" a partir de uma data ISO. */
export function quarterKey(dateISO) {
  const year = dateISO.slice(0, 4);
  const month = Number(dateISO.slice(5, 7));
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

/** Pontos de Opens (G-1/G-2) do atleta no ano (0 se virou o ano). */
export function openPointsThisYear(athlete, year) {
  const op = athlete.openPoints;
  return op && op.season === year ? op.value : 0;
}

/** Credita pontos de Open ao ano corrente (zera na virada de ano). */
export function addOpenPoints(athlete, year, pts) {
  if (!athlete.openPoints || athlete.openPoints.season !== year) {
    athlete.openPoints = { season: year, value: 0 };
  }
  athlete.openPoints.value += pts;
}

/** Nº de Opens que o atleta já disputou no trimestre da data. */
export function openEntriesThisQuarter(athlete, dateISO) {
  const q = quarterKey(dateISO);
  const oe = athlete.openEntries;
  return oe && oe.quarter === q ? oe.count : 0;
}

/** Registra a disputa de um Open no trimestre da data (zera na virada de trimestre). */
export function recordOpenEntry(athlete, dateISO) {
  const q = quarterKey(dateISO);
  if (!athlete.openEntries || athlete.openEntries.quarter !== q) {
    athlete.openEntries = { quarter: q, count: 0 };
  }
  athlete.openEntries.count += 1;
}
