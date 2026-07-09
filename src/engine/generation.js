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

/** Média-base dos atributos combativos a partir da força (0..1). */
export function baseFromStrength(strength) {
  const s = Math.max(0, Math.min(1, strength));
  return 52 + 30 * s; // 52 (mediano) .. 82 (elite)
}

/** Idade plausível com pico competitivo (~25 anos). */
export function generateAge(random) {
  return Math.round(Math.max(17, Math.min(34, random.gaussian(25, 4))));
}

/** Gera o mapa completo de atributos a partir de uma média-base. */
function generateAttributes(random, base, age) {
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
  const base = TIER_BASE[tier] ?? TIER_BASE["3"];
  const attributes = generateAttributes(random, base, age);

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

/**
 * Cria um atleta a partir de um registro REAL do ranking (híbrido).
 * Identidade e pontos vêm do arquivo; idade e atributos são gerados, com os
 * atributos ancorados na força (posição no ranking). Ver DECISIONS.md.
 *
 * @param {RandomSystem} random
 * @param {IdGenerator} idGen
 * @param {object} opts
 *   { entry, countryId, weightCategoryId, strength, gender, worldStartDate }
 *   - entry: { name, ioc, memberNumber, rank, points }
 *   - strength: 0..1 (1 = melhor ranqueado da categoria)
 */
export function generateRealAthlete(random, idGen, opts) {
  const {
    entry, countryId, weightCategoryId, strength, gender = "M", worldStartDate,
  } = opts;
  const age = generateAge(random);
  const attributes = generateAttributes(random, baseFromStrength(strength), age);

  const athlete = createAthlete({
    id: idGen.next("ATH"),
    forename: entry.name, // nome real completo em forename; surname vazio
    surname: "",
    countryId,
    gender,
    birthDate: birthDateFromAge(worldStartDate, age),
    weightCategoryId,
    attributes,
  });
  athlete.fullName = entry.name;
  athlete.memberNumber = entry.memberNumber;
  athlete.realRank = entry.rank;
  const pts = Math.round(entry.points * 100) / 100;
  athlete.ranking.points = pts;
  // Ponto de partida no ledger: os pontos reais como um resultado datado no
  // início do mundo (decairão ao longo das temporadas). Ver DECISIONS.md.
  if (pts > 0) {
    athlete.pointsLedger.push({
      date: worldStartDate,
      points: pts,
      gRank: "seed",
      competitionId: null,
    });
  }
  return athlete;
}
