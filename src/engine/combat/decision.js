/**
 * Decision Engine — escolhe a próxima ação dos atletas (combat_framework.md).
 * Responde a "o que o atleta tentará fazer agora?", nunca decide o resultado.
 */

import { ACTION_LIST } from "./rules.js";

/** Planos táticos e seu viés ofensivo (0 defensivo .. 1 ofensivo). */
export const PLANS = {
  ofensivo: { id: "ofensivo", offensiveBias: 0.85, riskAppetite: 0.7 },
  pressao: { id: "pressao", offensiveBias: 0.9, riskAppetite: 0.6 },
  equilibrado: { id: "equilibrado", offensiveBias: 0.5, riskAppetite: 0.5 },
  contraAtacador: { id: "contraAtacador", offensiveBias: 0.3, riskAppetite: 0.5 },
  defensivo: { id: "defensivo", offensiveBias: 0.2, riskAppetite: 0.3 },
  administrar: { id: "administrar", offensiveBias: 0.35, riskAppetite: 0.25 },
};

export const PLAN_LIST = Object.values(PLANS);

/** Sorteia um plano inicial coerente com os atributos do atleta. */
export function pickInitialPlan(random, attr) {
  const aggressive = attr.ataque + attr.explosao;
  const counter = attr.contraAtaque + attr.leituraLuta;
  const weights = [
    { value: PLANS.ofensivo, weight: aggressive },
    { value: PLANS.pressao, weight: aggressive * 0.8 },
    { value: PLANS.equilibrado, weight: 120 },
    { value: PLANS.contraAtacador, weight: counter },
    { value: PLANS.defensivo, weight: attr.defesa },
  ];
  return random.weighted(weights);
}

/**
 * Escolhe a ação ofensiva. Ações mais valiosas (e arriscadas) ficam mais
 * prováveis conforme ataque/precisão e o apetite ao risco (plano + situação).
 * @param {number} riskAppetite  0..1 (aumenta se o atleta está perdendo)
 */
export function chooseAction(random, side, riskAppetite) {
  const skill = (side.attr.ataque + side.attr.precisao) / 2 / 100; // 0..1
  const weights = ACTION_LIST.map((action) => {
    // Ações seguras têm peso base alto; arriscadas dependem de skill+apetite.
    const safe = 1 - action.risk;
    const daring = action.risk * (0.4 * skill + 0.6 * riskAppetite);
    return { value: action, weight: safe + daring };
  });
  return random.weighted(weights);
}

/**
 * Ajusta o comportamento (plano/apetite) conforme a situação da luta.
 * Perdendo → mais agressivo; vencendo com folga → administrar.
 * Usa Adaptabilidade para decidir se muda.
 * @returns {number} riskAppetite ajustado para as próximas trocas.
 */
export function adjustBehavior(side, opponentScore, ownScore) {
  const diff = ownScore - opponentScore;
  let risk = side.plan.riskAppetite;
  const adapt = (side.attr.adaptabilidade ?? 60) / 100;
  if (diff <= -3) {
    risk = Math.min(1, risk + 0.3 * adapt); // perdendo: arrisca mais
  } else if (diff >= 4) {
    risk = Math.max(0.1, risk - 0.25 * adapt); // vencendo: segura o jogo
  }
  // Cansaço reduz agressividade.
  if (side.energy < 30) risk = Math.max(0.1, risk - 0.2);
  return risk;
}
