/**
 * Sistema de Geração de Atletas.
 *
 * Cria atletas com atributos plausíveis a partir do tier do país, usando o
 * RandomSystem (nunca Math.random). Segue athlete_attributes.md: valores acima
 * de 90 são raros; a diferença entre a elite é pequena. Ver DECISIONS.md para
 * as fórmulas (ponto de calibração).
 */

import { RandomSystem } from "../services/random.js";
import { generateName } from "../services/nameGenerator.js";
import {
  ALL_ATTRIBUTES,
  TECHNICAL,
  PHYSICAL,
  MENTAL,
  DEVELOPMENT,
  clampAttribute,
} from "../config/attributes.js";
import { createAthlete } from "../entities/athlete.js";

/** Média-base dos atributos combativos por tier (força relativa do país). */
const TIER_BASE = { "1": 70, "2": 61, "3": 53 };
const ATTR_STD = 8; // desvio: mantém elite (>90) rara

const HIDDEN_EXTRA = [
  "consistencia",
  "facilidadeEvolucao",
  "personalidadeCompetitiva",
  "resistenciaPressao",
];

/** Gera o mapa completo de atributos de um atleta. */
function generateAttributes(random, tier, age) {
  const base = TIER_BASE[tier] ?? TIER_BASE["3"];
  const attrs = {};

  // Atributos combativos: gaussiana em torno da média do tier.
  for (const key of [...TECHNICAL, ...PHYSICAL, ...MENTAL]) {
    attrs[key] = Math.round(clampAttribute(random.gaussian(base, ATTR_STD)));
  }

  // Desenvolvimento.
  attrs.potencial = Math.round(clampAttribute(random.gaussian(base + 8, ATTR_STD)));
  // Experiência cresce com a idade (18→0, ~32→pico), com ruído.
  const expBase = Math.min(100, Math.max(0, (age - 18) * 6));
  attrs.experiencia = Math.round(clampAttribute(random.gaussian(expBase, 6)));
  attrs.formaAtual = Math.round(clampAttribute(random.gaussian(75, 8)));
  attrs.moral = Math.round(clampAttribute(random.gaussian(75, 8)));

  // Ocultos.
  for (const key of HIDDEN_EXTRA) {
    attrs[key] = Math.round(clampAttribute(random.gaussian(60, 12)));
  }

  // Garante que todo atributo declarado exista.
  for (const key of ALL_ATTRIBUTES) {
    if (attrs[key] === undefined) {
      attrs[key] = Math.round(clampAttribute(random.gaussian(base, ATTR_STD)));
    }
  }
  return attrs;
}

/** Deriva uma data de nascimento ISO a partir da idade e da data do mundo. */
function birthDateFromAge(worldStartDate, age) {
  const startYear = Number(worldStartDate.slice(0, 4));
  const birthYear = startYear - age;
  return `${birthYear}-01-01`;
}

/**
 * Gera um único atleta.
 * @param {RandomSystem} random
 * @param {IdGenerator} idGen
 * @param {object} opts { country, countryId, weightCategoryId, gender, worldStartDate }
 */
export function generateAthlete(random, idGen, opts) {
  const { country, countryId, weightCategoryId, gender = "M", worldStartDate } = opts;
  const tier = country.tier;
  const age = random.int(18, 32);
  const { forename, surname } = generateName(random, country.code);
  const attributes = generateAttributes(random, tier, age);

  return createAthlete({
    id: idGen.next("ATH"),
    forename,
    surname,
    countryId,
    gender,
    birthDate: birthDateFromAge(worldStartDate, age),
    weightCategoryId,
    attributes,
  });
}

/**
 * Gera vários atletas para um país, distribuídos pelas categorias informadas.
 * @returns {Array} lista de atletas.
 */
export function generateAthletesForCountry(random, idGen, opts) {
  const { country, countryId, categories, perCategory, gender = "M", worldStartDate } = opts;
  const athletes = [];
  for (const cat of categories) {
    for (let i = 0; i < perCategory; i++) {
      athletes.push(
        generateAthlete(random, idGen, {
          country,
          countryId,
          weightCategoryId: cat.id,
          gender,
          worldStartDate,
        })
      );
    }
  }
  return athletes;
}
