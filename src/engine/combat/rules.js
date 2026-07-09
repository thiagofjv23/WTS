/**
 * Rules Engine — regras oficiais da modalidade (combat_framework.md).
 * Catálogo de ações, valores de pontuação e critérios de vitória.
 *
 * Pontuação inspirada no World Taekwondo (parametrizável para calibração):
 *  soco=1, chute no corpo=2, chute na cabeça=3, giratório no corpo=4,
 *  giratório na cabeça=5. Gam-jeom (penalidade) dá +1 ao adversário.
 * Formato: melhor de 3 rounds (vence quem ganhar 2 rounds).
 */

/**
 * Catálogo de ações ofensivas.
 * points  → pontos se acertar
 * baseLand→ probabilidade-base de acerto (antes dos atributos)
 * cost    → custo de energia
 * risk    → quão "arriscada"/vistosa (usada pela Decision Engine)
 */
export const ACTIONS = {
  punch: { id: "punch", points: 1, baseLand: 0.55, cost: 3, risk: 0.1 },
  bodyKick: { id: "bodyKick", points: 2, baseLand: 0.42, cost: 6, risk: 0.3 },
  headKick: { id: "headKick", points: 3, baseLand: 0.24, cost: 9, risk: 0.6 },
  spinBody: { id: "spinBody", points: 4, baseLand: 0.16, cost: 12, risk: 0.8 },
  spinHead: { id: "spinHead", points: 5, baseLand: 0.09, cost: 15, risk: 1.0 },
};

export const ACTION_LIST = Object.values(ACTIONS);

/** Ação usada num contra-ataque (rápida, valor médio). */
export const COUNTER_ACTION = ACTIONS.bodyKick;

export const GAMJEOM_POINT = 1;
export const ROUNDS_TO_WIN = 2;
export const TOTAL_ROUNDS = 3;

/** Resolve o vencedor de um round pelo placar; empate é sinalizado com null. */
export function roundWinner(roundScore) {
  if (roundScore.A > roundScore.B) return "A";
  if (roundScore.B > roundScore.A) return "B";
  return null; // empate → resolvido por desempate (golden exchange)
}

/** True se a luta já tem vencedor (alguém alcançou ROUNDS_TO_WIN). */
export function matchDecided(roundsWon) {
  return roundsWon.A >= ROUNDS_TO_WIN || roundsWon.B >= ROUNDS_TO_WIN;
}
