/**
 * World — contêiner do estado global do simulador.
 *
 * É a "principal estrutura salva no jogo" (DataArchitecture.md → WorldState),
 * ampliada com os repositórios de entidades. Totalmente serializável: entidades
 * guardadas por ID, relacionamentos por referência de ID, sem ciclos.
 *
 * Os estados do RandomSystem e do IdGenerator são guardados aqui para que um
 * save restaure a simulação exatamente no mesmo ponto (determinismo).
 */

export const WORLD_VERSION = 1;

/**
 * Cria um mundo vazio.
 * @param {object} opts { seed, startDate }
 */
export function createWorld(opts = {}) {
  const { seed = 1, startDate = "2028-01-01" } = opts;
  const startYear = Number(startDate.slice(0, 4));
  return {
    meta: {
      version: WORLD_VERSION,
      seed,
    },
    state: {
      currentDate: startDate,
      currentSeason: startYear,
      processedDays: 0,
    },
    // Repositórios (mapas por ID).
    athletes: {},
    countries: {},
    competitions: {},
    rankings: {},
    // Sequências.
    calendar: [],
    history: [],
    news: [],
    injuries: [], // lesões ativas: { athleteId, until, severity }
    rivalries: {}, // rivalidades por par: pairKey → { intensity, meetings, ... }
    wildcards: [], // vagas da President's Cup p/ o continental: { continent, categoryId, candidates, ... }
    yearRankSnapshots: {}, // ranking de janeiro por ano: { [ano]: { [cat]: [[id, pontos], ...] } }
    nationalTeams: {}, // seleções nacionais: { [ioc]: { [cat]: { titulares:[], reservas:[], year } } }
    grandSlamMerit: [], // ledger do Ranking de Mérito Grand Slam: { date, athleteId, categoryId, points, competitionId }
    olympicQuotas: {}, // vagas olímpicas por ano: { [ano]: { [cat]: [{ athleteId, method, countryCode }] } }
    favorites: { athletes: [], countries: [], competitions: [] },
    configuration: {},
    // Estados dos serviços (para salvamento determinístico).
    rngState: null,
    idState: {},
  };
}

/** Insere um atleta e liga-o ao país. */
export function addAthlete(world, athlete) {
  world.athletes[athlete.id] = athlete;
  const country = world.countries[athlete.countryId];
  if (country && !country.athleteIds.includes(athlete.id)) {
    country.athleteIds.push(athlete.id);
  }
  return athlete;
}

/** Insere um país. */
export function addCountry(world, country) {
  world.countries[country.id] = country;
  return country;
}

/** Retorna atletas ativos de uma categoria de peso. */
export function athletesInCategory(world, weightCategoryId, { onlyActive = true } = {}) {
  return Object.values(world.athletes).filter(
    (a) =>
      a.weightCategoryId === weightCategoryId &&
      (!onlyActive || a.status === "ativo")
  );
}

/** Contagens rápidas para inspeção/testes. */
export function worldCounts(world) {
  return {
    athletes: Object.keys(world.athletes).length,
    countries: Object.keys(world.countries).length,
    competitions: Object.keys(world.competitions).length,
  };
}
