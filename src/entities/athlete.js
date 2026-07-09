/**
 * Entidade Athlete (dados apenas — sem lógica de negócio).
 * Baseado em DataArchitecture.md e athlete_attributes.md.
 *
 * Organização inspirada em ECS: os dados são agrupados em componentes
 * (identidade, atributos, carreira, estatísticas, ranking, histórico), evitando
 * um objeto gigante e facilitando expansões futuras. Totalmente serializável
 * em JSON, com relacionamentos por ID (countryId, weightCategoryId).
 */

export const ATHLETE_STATUS = {
  ACTIVE: "ativo",
  INJURED: "lesionado",
  RETIRED: "aposentado",
  SUSPENDED: "suspenso",
};

/** Estatísticas de carreira zeradas. */
export function emptyAthleteStatistics() {
  return {
    fights: 0,
    wins: 0,
    losses: 0,
    golds: 0,
    silvers: 0,
    bronzes: 0,
    competitions: 0,
  };
}

/**
 * Cria um atleta a partir de dados já resolvidos.
 * A GERAÇÃO de atributos (aleatória por tier) vive no sistema de geração; aqui
 * apenas montamos a entidade de forma previsível.
 *
 * @param {object} data
 * @param {string} data.id
 * @param {string} data.forename
 * @param {string} data.surname
 * @param {string} data.countryId
 * @param {string} data.gender          "M" no escopo atual
 * @param {string} data.birthDate       ISO-8601
 * @param {string} data.weightCategoryId
 * @param {object} data.attributes      mapa atributo→valor (0–100)
 * @param {string} [data.status]
 */
export function createAthlete(data) {
  const {
    id,
    forename,
    surname,
    countryId,
    gender,
    birthDate,
    weightCategoryId,
    attributes,
    status = ATHLETE_STATUS.ACTIVE,
  } = data;

  if (!id) throw new Error("Athlete: id é obrigatório.");
  if (!countryId) throw new Error("Athlete: countryId é obrigatório.");
  if (!weightCategoryId) throw new Error("Athlete: weightCategoryId é obrigatório.");
  if (!attributes) throw new Error("Athlete: attributes é obrigatório.");

  return {
    id,
    forename,
    surname,
    fullName: `${forename} ${surname}`,
    countryId,
    gender,
    birthDate,
    weightCategoryId,
    status,
    attributes: { ...attributes },
    ranking: {
      points: 0,
      position: null,
    },
    statistics: emptyAthleteStatistics(),
    history: [],
    schemaVersion: 1,
  };
}
