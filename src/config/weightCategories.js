/**
 * Categorias de Peso — fonte única da verdade.
 * Baseado em taekwondo-ranking.md §4 (categorias olímpicas).
 *
 * ESCOPO ATUAL: apenas masculino (decisão do usuário; ver DECISIONS.md/TODO.md).
 * As femininas (-49, -57, -67, +67 kg) entram por extensão neste mesmo arquivo.
 */

/** Categorias olímpicas masculinas. minKg/maxKg em kg (null = sem limite). */
export const MEN_CATEGORIES = [
  { id: "WC-M-58", name: "-58 kg", gender: "M", minKg: null, maxKg: 58 },
  { id: "WC-M-68", name: "-68 kg", gender: "M", minKg: 58, maxKg: 68 },
  { id: "WC-M-80", name: "-80 kg", gender: "M", minKg: 68, maxKg: 80 },
  { id: "WC-M-80+", name: "+80 kg", gender: "M", minKg: 80, maxKg: null },
];

/** Todas as categorias ativas no escopo atual. */
export const WEIGHT_CATEGORIES = [...MEN_CATEGORIES];

const BY_ID = new Map(WEIGHT_CATEGORIES.map((c) => [c.id, c]));

export function getWeightCategory(id) {
  return BY_ID.get(id) || null;
}

export function categoriesForGender(gender) {
  return WEIGHT_CATEGORIES.filter((c) => c.gender === gender);
}
