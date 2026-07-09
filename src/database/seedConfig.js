/**
 * Configuração do Seed Inicial (versão de núcleo, pequena).
 *
 * Baseado em seed_inicial.md, porém reduzido para provar o pipeline ponta a
 * ponta. Só masculino e só países presentes nos dois arquivos de nomes.
 * O seed completo (~2.200 atletas, tiers, distribuição histórica) está no
 * TODO.md para retomada após a validação do núcleo.
 */

/** Países do seed pequeno. `weight` reflete a proporção histórica de atletas. */
export const SEED_COUNTRIES = [
  { code: "KR", name: "Coreia do Sul", tier: "1", weight: 3 },
  { code: "TR", name: "Turquia", tier: "1", weight: 2 },
  { code: "CN", name: "China", tier: "1", weight: 2 },
  { code: "BR", name: "Brasil", tier: "1", weight: 2 },
];

/** Atletas por categoria por país (base). Multiplicado pelo weight do país. */
export const BASE_PER_CATEGORY = 2;

/** Data de início do mundo. */
export const WORLD_START_DATE = "2028-01-01";
