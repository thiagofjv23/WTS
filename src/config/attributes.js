/**
 * Configuração de Atributos dos Atletas — fonte única da verdade.
 * Baseado em athlete_attributes.md (escala 0–100).
 *
 * Entidades apenas armazenam valores; a engine de combate os interpreta.
 * Este arquivo define QUAIS atributos existem e em que grupo, para que geração,
 * validação e UI compartilhem a mesma referência.
 */

export const ATTRIBUTE_RANGE = { min: 0, max: 100 };

/** Grupo 1 — Técnicos (participam diretamente do cálculo das trocas). */
export const TECHNICAL = [
  "ataque",
  "defesa",
  "contraAtaque",
  "precisao",
  "velocidade",
  "controleDistancia",
];

/** Grupo 2 — Físicos. */
export const PHYSICAL = ["explosao", "resistencia", "recuperacao", "equilibrio"];

/** Grupo 3 — Mentais. */
export const MENTAL = [
  "inteligenciaTatica",
  "leituraLuta",
  "disciplina",
  "sangueFrio",
  "adaptabilidade",
];

/**
 * Grupo 4 — Desenvolvimento (influenciam a carreira, não a troca em si).
 * `potencial` é preferencialmente oculto ao jogador.
 */
export const DEVELOPMENT = ["potencial", "experiencia", "formaAtual", "moral"];

/** Atributos ocultos (aumentam a imprevisibilidade; invisíveis na UI). */
export const HIDDEN = [
  "potencial",
  "consistencia",
  "facilidadeEvolucao",
  "personalidadeCompetitiva",
  "resistenciaPressao",
];

export const ATTRIBUTE_GROUPS = {
  technical: TECHNICAL,
  physical: PHYSICAL,
  mental: MENTAL,
  development: DEVELOPMENT,
};

/** Todos os atributos combativos + carreira (sem duplicar ocultos já listados). */
export const ALL_ATTRIBUTES = [
  ...TECHNICAL,
  ...PHYSICAL,
  ...MENTAL,
  ...DEVELOPMENT,
  "consistencia",
  "facilidadeEvolucao",
  "personalidadeCompetitiva",
  "resistenciaPressao",
];

/** Restringe um valor à escala válida. */
export function clampAttribute(value) {
  const { min, max } = ATTRIBUTE_RANGE;
  return Math.max(min, Math.min(max, value));
}

/** True se todos os atributos combativos estão presentes e na faixa. */
export function validateAttributes(attributes) {
  const combat = [...TECHNICAL, ...PHYSICAL, ...MENTAL];
  for (const key of combat) {
    const v = attributes[key];
    if (typeof v !== "number" || v < ATTRIBUTE_RANGE.min || v > ATTRIBUTE_RANGE.max) {
      return false;
    }
  }
  return true;
}
