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
 *  - penaltyPerLevel: penalidade por nível de distância continental (ver matriz).
 * Calibração: Local praticamente não cruza continente (100/nível); Agressivo/
 * Escalador conseguem ir a um continente vizinho quando precisam de pontos.
 */
export const PROFILE_PARAMS = {
  [AthleteProfile.ELITE]: { penaltyPerLevel: 14 },
  [AthleteProfile.AGGRESSIVE]: { penaltyPerLevel: 5 },
  [AthleteProfile.CLIMBER]: { penaltyPerLevel: 8 },
  [AthleteProfile.LOCAL]: { penaltyPerLevel: 100 },
};

/**
 * Planejamento anual de Opens por perfil (nº-alvo de Opens no ano):
 *  - base: quantos faria num ano tranquilo;
 *  - max: teto quando está "desesperado" por pontos (muito decaimento a repor).
 * A pressão de decaimento (pontos que o atleta vai perder no ano) empurra do
 * base ao max. O teto de 40 pontos de Open ainda corta em tempo de execução.
 */
export const PROFILE_SEASON = {
  [AthleteProfile.ELITE]: { base: 1, max: 3 },
  [AthleteProfile.AGGRESSIVE]: { base: 6, max: 12 },
  [AthleteProfile.CLIMBER]: { base: 4, max: 9 },
  [AthleteProfile.LOCAL]: { base: 3, max: 6 },
};

/** Perda de pontos no ano que satura a agressividade (base → max). */
export const DECAY_AGGRESSION_REF = 50;

/**
 * Fadiga / espaçamento do calendário de Opens:
 *  - minRestDays: intervalo mínimo entre dois Opens do mesmo atleta (evita
 *    mesmo-dia e sobrecarga);
 *  - maxPerMonth: máximo de Opens por mês.
 */
export const FATIGUE = { minRestDays: 12, maxPerMonth: 2 };

/** Perfis que, ao perder um Open por lesão, buscam um substituto (vs. só perder a vaga). */
export function seeksReplacement(profile) {
  return profile === AthleteProfile.AGGRESSIVE || profile === AthleteProfile.CLIMBER;
}

/**
 * É um Open comum (G-1/G-2) sujeito ao planejamento por perfil? Exclui eventos
 * por convite, o Grand Slam Challenge (G-2 especial) e eventos de tipo especial
 * (Seletiva Nacional, etapas olímpicas — que usam G-1/G-2 apenas como dummy).
 */
export function isRegularOpen(competition, rules) {
  const g = competition.gRank;
  if (g !== "G-1" && g !== "G-2") return false;
  if (competition.type && competition.type !== "official") return false;
  if (rules?.invitational) return false;
  if (/grand slam challenge/i.test(competition.name || "")) return false;
  return true;
}

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

/**
 * Redutor da penalidade de viagem para atletas de Seleção Nacional: titulares
 * viajam mais fácil que reservas, e ambos mais fácil que quem NÃO é de seleção.
 * Fora de seleção (null/undefined) → fator 1 (comportamento inalterado).
 */
export const NATIONAL_TEAM_PENALTY_FACTOR = { titular: 0.5, reserva: 0.75 };

/**
 * Penalidade de distância para um perfil (região do atleta × região do torneio).
 * Atletas de Seleção Nacional pagam menos (ver NATIONAL_TEAM_PENALTY_FACTOR).
 */
export function distancePenalty(profile, athleteContinent, tournamentContinent, nationalTeam) {
  const level = continentDistance(athleteContinent, tournamentContinent);
  const factor = NATIONAL_TEAM_PENALTY_FACTOR[nationalTeam] ?? 1;
  return level * (PROFILE_PARAMS[profile]?.penaltyPerLevel ?? 100) * factor;
}

/** Score de um Open: pontos do torneio menos a penalidade de distância. */
export function openScore(profile, tournamentPts, athleteContinent, tournamentContinent, nationalTeam) {
  return tournamentPts - distancePenalty(profile, athleteContinent, tournamentContinent, nationalTeam);
}

// ---- Contador anual de pontos de Opens (no próprio atleta) --------------------

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
