/**
 * Probability Engine — transforma atributos em probabilidades (combat_framework.md).
 * Nunca decide vencedores; apenas calcula chances. Ponto de calibração central
 * (ver DECISIONS.md).
 */

/**
 * Configuração de combate (calibração). `k` é a inclinação da curva de vantagem:
 * menor = mais equilíbrio/zebras (favoritos vencem menos por larga margem).
 * Ver DECISIONS.md/TODO.
 */
export const COMBAT_CONFIG = { k: 0.03 };

/** Logística: mapeia uma diferença de atributos para (0,1), centrada em 0.5. */
export function logistic(diff, k = COMBAT_CONFIG.k) {
  return 1 / (1 + Math.exp(-k * diff));
}

/** Vantagem relativa de a sobre b em (0,1); 0.5 = equilíbrio. */
export function advantage(a, b, k = COMBAT_CONFIG.k) {
  return logistic(a - b, k);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Efetividade por energia: 100→1.0, 0→0.7. */
export function energyFactor(energy) {
  return 0.7 + 0.3 * (energy / 100);
}

/** Pequeno bônus/malus por forma e moral (leve, conforme athlete_attributes). */
export function formFactor(attr) {
  const form = ((attr.formaAtual ?? 70) + (attr.moral ?? 70)) / 2;
  return 0.95 + 0.1 * (form / 100); // 0.95..1.05
}

/** Quem controla a distância nesta troca (prob. de A controlar). */
export function distanceControlProb(a, b) {
  const sa = a.velocidade * 0.4 + a.controleDistancia * 0.4 + a.inteligenciaTatica * 0.2;
  const sb = b.velocidade * 0.4 + b.controleDistancia * 0.4 + b.inteligenciaTatica * 0.2;
  return advantage(sa, sb);
}

/**
 * Probabilidade de A tomar a iniciativa (atacar) nesta troca.
 * Considera velocidade, momentum e viés ofensivo do plano.
 */
export function initiativeProb(a, b, planBiasA, planBiasB) {
  const sa = a.attr.velocidade + a.momentum * 5 + planBiasA * 20;
  const sb = b.attr.velocidade + b.momentum * 5 + planBiasB * 20;
  return advantage(sa, sb, 0.05);
}

/** Probabilidade de a ação do atacante acertar (defesa não impede). */
export function landProb(attacker, defender, action) {
  const off = attacker.attr.ataque * 0.5 + attacker.attr.precisao * 0.5;
  const def = defender.attr.defesa;
  const mod = advantage(off, def); // 0..1
  const p = action.baseLand * (0.5 + mod) * energyFactor(attacker.energy) * formFactor(attacker.attr);
  return clamp(p, 0.02, 0.97);
}

/** Probabilidade de o defensor conseguir defender a ação. */
export function defenseProb(defender, attacker) {
  const defScore = defender.attr.defesa * 0.6 + defender.attr.leituraLuta * 0.4;
  const offScore = attacker.attr.ataque * 0.5 + attacker.attr.precisao * 0.5;
  const p = 0.30 + 0.5 * (advantage(defScore, offScore) - 0.5) * 2;
  return clamp(p * energyFactor(defender.energy), 0.08, 0.75);
}

/** Probabilidade de o defensor emendar um contra-ataque após defender. */
export function counterProb(defender, attacker) {
  const cScore = defender.attr.contraAtaque * 0.6 + defender.attr.velocidade * 0.4;
  const p = 0.25 + 0.5 * (advantage(cScore, attacker.attr.velocidade) - 0.5) * 2;
  return clamp(p * energyFactor(defender.energy), 0.05, 0.6);
}

/** Chance de cometer penalidade (gam-jeom) nesta troca, por indisciplina. */
export function gamJeomProb(side) {
  const indiscipline = 100 - (side.attr.disciplina ?? 60);
  return clamp((indiscipline / 100) * 0.03, 0, 0.05);
}

/** Rating combativo aproximado (para desempates e testes). */
export function combatRating(attr) {
  const keys = [
    "ataque", "defesa", "contraAtaque", "precisao", "velocidade",
    "controleDistancia", "explosao", "resistencia", "equilibrio",
    "inteligenciaTatica", "leituraLuta", "sangueFrio",
  ];
  const sum = keys.reduce((s, k) => s + (attr[k] ?? 0), 0);
  return sum / keys.length;
}
