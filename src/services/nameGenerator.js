/**
 * Name Generator
 *
 * Gera nomes de atletas por país a partir do dicionário compacto
 * (src/database/names.js, produzido por scripts/buildNames.mjs).
 *
 * Em runtime o custo é mínimo: dois sorteios O(1) via RandomSystem. Nenhum
 * parse de arquivo grande ocorre no jogo. Ver DECISIONS.md.
 */

import { NAMES } from "../database/names.js";

/** Lista de países com nomes disponíveis no build atual. */
export function availableCountries() {
  return Object.keys(NAMES);
}

/** True se há nomes para o país informado. */
export function hasCountry(countryCode) {
  return Object.prototype.hasOwnProperty.call(NAMES, countryCode);
}

/**
 * Gera um nome completo para um país.
 * @param {import('./random.js').RandomSystem} random  fonte de aleatoriedade
 * @param {string} countryCode  ISO-2 (ex.: "KR")
 * @returns {{forename: string, surname: string, fullName: string}}
 */
export function generateName(random, countryCode) {
  const pool = NAMES[countryCode];
  if (!pool) {
    throw new Error(
      `Sem nomes para o país "${countryCode}". Rode npm run build:names incluindo-o.`
    );
  }
  const forename = random.pick(pool.forenames);
  const surname = random.pick(pool.surnames);
  return { forename, surname, fullName: `${forename} ${surname}` };
}
