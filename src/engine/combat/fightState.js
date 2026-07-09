/**
 * Fight State — a única fonte de verdade durante um combate (combat_framework.md).
 * Cada engine recebe este objeto, altera apenas sua responsabilidade e o devolve.
 */

/** Estado dinâmico de um lado da luta (não altera os atributos permanentes). */
function createSideState(athlete, plan) {
  return {
    id: athlete.id,
    attr: athlete.attributes, // referência somente-leitura aos atributos
    plan, // plano tático atual
    energy: 100,
    confidence: 60,
    momentum: 0,
    gamJeom: 0, // penalidades sofridas
  };
}

/**
 * Cria o estado inicial de uma luta entre dois atletas.
 * @param {object} athleteA
 * @param {object} athleteB
 * @param {object} plans { A, B } planos táticos iniciais
 */
export function createFightState(athleteA, athleteB, plans) {
  return {
    A: createSideState(athleteA, plans.A),
    B: createSideState(athleteB, plans.B),
    round: 1,
    roundScore: { A: 0, B: 0 },
    roundsWon: { A: 0, B: 0 },
    events: [],
    stats: {
      A: emptySideStats(),
      B: emptySideStats(),
    },
    finished: false,
    winnerId: null,
    loserId: null,
    roundHistory: [],
  };
}

export function emptySideStats() {
  return {
    attemptsTotal: 0,
    landed: 0,
    blocked: 0,
    counters: 0,
    points: 0,
    byAction: {},
  };
}
