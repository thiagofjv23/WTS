/**
 * Configuração dos ciclos olímpicos.
 *
 * A lógica olímpica (engine/olympics.js) NUNCA usa valores fixos: lê tudo daqui.
 * Cada edição pode sobrescrever a base em `OLYMPIC_OVERRIDES` — assim, se a World
 * Taekwondo mudar categorias, vagas ou critérios, basta editar a configuração do
 * ciclo, sem tocar na lógica. (Diretriz "Arquitetura do Sistema — Sem Hardcoded"
 * do documento Jogos Olímpicos.md.)
 *
 * ESCOPO ATUAL: só masculino (o feminino entra quando o jogo o suportar).
 */

import { MEN_CATEGORIES } from "./weightCategories.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

/** Primeira Olimpíada do simulador e o ciclo (a cada 4 anos). */
export const OLYMPIC_FIRST_YEAR = 2028;
export const OLYMPIC_CYCLE_YEARS = 4;

/**
 * Sedes olímpicas (cidade + país por código IOC). English names.
 * TODO: hoje é uma lista fixa; trocar por SORTEIO das sedes futuramente
 * (ver TODO.md). Sedes cujo país não está no roster simplesmente não recebem a
 * vaga de país-sede (a Comissão Tripartite completa as vagas).
 */
export const OLYMPIC_HOSTS = {
  2028: { city: "Los Angeles", country: "USA" },
  2032: { city: "Brisbane", country: "AUS" },
  2036: { city: "Munich", country: "GER" },
  2040: { city: "Nusantara", country: "INA" },
  2044: { city: "Santiago", country: "CHI" },
  2048: { city: "Cairo", country: "EGY" },
  2052: { city: "Milan", country: "ITA" },
  2056: { city: "Houston", country: "USA" },
  2060: { city: "Shanghai", country: "CHN" },
  2064: { city: "Liverpool", country: "GBR" },
  2068: { city: "Ahmedabad", country: "IND" },
  2072: { city: "São Paulo", country: "BRA" },
  2076: { city: "Istanbul", country: "TUR" },
  2080: { city: "Toronto", country: "CAN" },
  2084: { city: "Moscow", country: "RUS" },
  2088: { city: "Osaka", country: "JPN" },
  2092: { city: "Johannesburg", country: "RSA" },
  2096: { city: "Waitakere", country: "NZL" },
  2100: { city: "Athens", country: "GRE" },
};

/** É um ano de Jogos Olímpicos? (a cada 4 anos a partir de 2028). */
export function isOlympicYear(year) {
  return year >= OLYMPIC_FIRST_YEAR && (year - OLYMPIC_FIRST_YEAR) % OLYMPIC_CYCLE_YEARS === 0;
}

/** Sede de um ano olímpico ({ city, country } por IOC), ou null. */
export function olympicHost(year) {
  return OLYMPIC_HOSTS[year] || null;
}

/**
 * Configuração-base (modelo Paris 2024), aplicada a todos os ciclos por padrão.
 * As datas de classificação por ranking/Grand Slam usam o ANO ANTERIOR; as
 * qualificatórias continentais e os Jogos usam o ANO OLÍMPICO.
 */
function baseConfig(year) {
  const host = olympicHost(year);
  return {
    year,
    categories: MEN_IDS,
    fieldPerCategory: 16, // 16 atletas por categoria (Paris 2024)
    perCountryLimit: 1, // 1 atleta por país por categoria
    gRank: "G-20", // Jogos: campeão 200 pts (evento oficial, pontua no ranking)
    gamesDate: `${year}-07-30`,
    gamesName: `Taekwondo at the ${year} Summer Olympics`,
    host, // { city, country } ou null

    // Etapa 1 — Ranking Olímpico (nosso ranking mundial), 3/dez do ano anterior.
    ranking: { mmdd: "12-03", year: year - 1, qualifiers: 5, method: "ranking" },
    // Vaga do Grand Slam — líder do Ranking de Mérito, 17/dez do ano anterior.
    grandSlam: { mmdd: "12-17", year: year - 1, quota: 1, method: "grandslam" },

    // Etapa 2 — Torneios Classificatórios Continentais (ano olímpico).
    // Nomes reais em inglês. Só concedem VAGA (não pontuam no ranking).
    continental: [
      { code: "AFR", region: "African", mmdd: "02-10", quota: 2 },
      { code: "EUR", region: "European", mmdd: "03-09", quota: 2 },
      { code: "ASI", region: "Asian", mmdd: "03-15", quota: 2 },
      { code: "OCE", region: "Oceania", mmdd: "04-06", quota: 1 },
      { code: "PAM", region: "Pan American", mmdd: "04-09", quota: 2 },
    ],

    // Etapa 3 — País-sede: 2 vagas nas categorias em que a sede ainda não tem
    // atleta classificado. Sobra vira vaga de Comissão Tripartite.
    hostRule: { quota: 2 },

    // Etapa 4 — Comissão Tripartite: completa até 16, no máx. 1 de cada tipo:
    // melhor não classificado, melhor do continente-sede, e melhor de um país
    // aleatório abaixo da posição N do ranking de países.
    tripartite: { best: 1, hostContinent: 1, randomCountry: 1, countryRankBelow: 20 },
  };
}

/** Sobrescritas por edição (vazio: todas usam a base do modelo Paris 2024). */
const OLYMPIC_OVERRIDES = {};

/** Configuração do ciclo olímpico de um ano (base + sobrescrita da edição). */
export function getOlympicConfig(year) {
  return { ...baseConfig(year), ...(OLYMPIC_OVERRIDES[year] || {}) };
}

/** Nome real (inglês) de um torneio classificatório continental. */
export function continentalQualName(year, region) {
  return `${year} ${region} Taekwondo Olympic Qualification Tournament`;
}
