/**
 * Região de um torneio (país-sede e continente) a partir do local.
 *
 * O calendário guarda `location = "Cidade, País"` com o MESMO nome de país do
 * roster (REAL_COUNTRIES). Aqui casamos o nome do país ao código IOC e ao
 * continente. Usado pela decisão de calendário dos Opens (prioridade nacional/
 * continental e penalidade de distância). Resultado é memoizado por competição.
 */

import { continentOf } from "../config/continents.js";

/** Normaliza um nome de país para casar apesar de caixa/pontuação. */
function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ") // pontuação → espaço
    .replace(/\s+/g, " ")
    .trim();
}

/** Índice nome-normalizado → código IOC (memoizado no mundo). */
function countryNameIndex(world) {
  if (world._countryNameIndex) return world._countryNameIndex;
  const idx = new Map();
  for (const c of Object.values(world.countries)) {
    if (c.name && c.code) idx.set(normalizeName(c.name), c.code);
  }
  world._countryNameIndex = idx;
  return idx;
}

/**
 * País-sede e continente de uma competição pelo local, ou null se não resolver.
 * @returns {{ code: string, continent: string|null }|null}
 */
export function resolveHostRegion(world, competition) {
  if (competition._host !== undefined) return competition._host;
  let host = null;
  const loc = competition.location || "";
  const country = loc.includes(",") ? loc.slice(loc.lastIndexOf(",") + 1) : loc;
  const key = normalizeName(country || "");
  if (key) {
    const code = countryNameIndex(world).get(key) || null;
    if (code) host = { code, continent: continentOf(code) };
  }
  competition._host = host;
  return host;
}
