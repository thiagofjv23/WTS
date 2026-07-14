/**
 * Jogos Olímpicos e classificação olímpica.
 * Fonte: "Jogos Olímpicos.md" e "Esquema de classificação para as Olimpíadas.md".
 *
 * O maior torneio do ecossistema: a cada 4 anos (2028, 2032, …), 16 atletas por
 * categoria, 1 por país, chave de eliminação simples (evento oficial G-20, pontua
 * no ranking). A LÓGICA lê tudo de `config/olympics.js` (sem hardcode).
 *
 * Classificação (ordem rígida; ao garantir vaga, o atleta sai das etapas
 * seguintes):
 *   1. Ranking Olímpico  — top 5 do ranking mundial (3/dez do ano anterior).
 *   2. Grand Slam        — líder do Ranking de Mérito (17/dez do ano anterior),
 *                          escorregando se já classificado.
 *   3. Continentais      — torneios classificatórios (ano olímpico): África/Ásia/
 *                          Europa/Pan-América 2 finalistas, Oceania 1 campeão.
 *   4. País-sede         — 2 vagas nas categorias sem atleta da sede.
 *   5. Comissão Tripartite — completa até 16.
 *
 * As vagas ficam em `world.olympicQuotas[ano][categoria]`. Ver docs/OLYMPICS.md.
 */

import { createCompetition } from "../entities/competition.js";
import { scheduleCompetition } from "./calendar.js";
import { athletesInCategory } from "../core/world.js";
import { combatRating } from "./combat/probability.js";
import { continentOf } from "../config/continents.js";
import { grandSlamMeritRanking } from "./grandSlam.js";
import { ATHLETE_STATUS } from "../entities/athlete.js";
import { MEN_CATEGORIES } from "../config/weightCategories.js";
import { pushNews } from "./news.js";
import {
  getOlympicConfig,
  isOlympicYear,
  olympicHost,
  continentalQualName,
} from "../config/olympics.js";

const MEN_IDS = MEN_CATEGORIES.map((c) => c.id);

// ---- Detecção de tipos --------------------------------------------------------

export function isOlympics(competition) {
  return competition?.type === "olympic-games";
}
export function isOlympicRankingQual(competition) {
  return competition?.type === "olympic-ranking-qual";
}
export function isOlympicGrandSlamQual(competition) {
  return competition?.type === "olympic-grandslam-qual";
}
export function isOlympicContinentalQual(competition) {
  return competition?.type === "olympic-continental-qual";
}
/** Evento (de papel) que fecha o campo e faz a verificação de lesões (15 dias antes). */
export function isOlympicFinalCheck(competition) {
  return competition?.type === "olympic-final-check";
}
/** Qualquer etapa classificatória "de papel" ou torneio continental olímpico. */
export function isOlympicQualification(competition) {
  return (
    isOlympicRankingQual(competition) ||
    isOlympicGrandSlamQual(competition) ||
    isOlympicContinentalQual(competition) ||
    isOlympicFinalCheck(competition)
  );
}

/** Encontra os Jogos de um ano (para marcar o campo como fechado). */
export function findOlympicsGames(world, year) {
  return Object.values(world.competitions).find((c) => isOlympics(c) && c.olympicYear === year) || null;
}

// ---- Ledger de vagas ----------------------------------------------------------

function countryCodeOf(world, athleteId) {
  const a = world.athletes[athleteId];
  return a ? world.countries[a.countryId]?.code || a.countryId : null;
}

function byRanking(a, b) {
  if ((b.ranking?.points ?? 0) !== (a.ranking?.points ?? 0)) {
    return (b.ranking?.points ?? 0) - (a.ranking?.points ?? 0);
  }
  return combatRating(b.attributes) - combatRating(a.attributes);
}

/** Vagas de uma categoria num ano olímpico (array, pode estar vazio). */
export function categoryQuotas(world, year, categoryId) {
  return world.olympicQuotas?.[year]?.[categoryId] || [];
}

function isQualifiedInCategory(world, year, categoryId, athleteId) {
  return categoryQuotas(world, year, categoryId).some((q) => q.athleteId === athleteId);
}

function countryHasQuota(world, year, categoryId, code) {
  return categoryQuotas(world, year, categoryId).some((q) => q.countryCode === code);
}

function categoryFull(world, year, categoryId, config) {
  return categoryQuotas(world, year, categoryId).length >= config.fieldPerCategory;
}

/**
 * Concede uma vaga (respeitando lotação da categoria, 1/país e sem duplicar o
 * atleta). @returns {boolean} true se concedeu.
 */
function addQuota(world, year, categoryId, athleteId, method, config) {
  const a = world.athletes[athleteId];
  if (!a) return false;
  const code = countryCodeOf(world, athleteId);
  const bucket = (((world.olympicQuotas ||= {})[year] ||= {})[categoryId] ||= []);
  if (bucket.length >= config.fieldPerCategory) return false;
  if (bucket.some((q) => q.athleteId === athleteId)) return false;
  if (bucket.some((q) => q.countryCode === code)) return false; // 1 por país
  bucket.push({ athleteId, method, countryCode: code });
  return true;
}

/** Atletas ativos não classificados de um país sem vaga na categoria. */
function unqualifiedPool(world, year, categoryId) {
  return athletesInCategory(world, categoryId).filter((a) => {
    if (a.status !== ATHLETE_STATUS.ACTIVE) return false;
    if (isQualifiedInCategory(world, year, categoryId, a.id)) return false;
    if (countryHasQuota(world, year, categoryId, countryCodeOf(world, a.id))) return false;
    return true;
  });
}

/** Mantém o melhor ranqueado de cada país num conjunto de atletas. */
function oneBestPerCountry(world, athletes) {
  const best = new Map();
  for (const a of [...athletes].sort(byRanking)) {
    const code = countryCodeOf(world, a.id);
    if (!best.has(code)) best.set(code, a);
  }
  return [...best.values()];
}

// ---- Agendamento --------------------------------------------------------------

function scheduleQualPaper(world, idGen, { type, name, date, categoryIds, olympicYear }) {
  const comp = createCompetition({
    id: idGen.next("COMP"),
    name,
    gRank: "G-20", // dummy p/ createCompetition; evento "de papel" não pontua
    date,
    categoryIds,
    location: null,
    fieldSize: null,
    type,
  });
  comp.olympicYear = olympicYear;
  scheduleCompetition(world, idGen, comp);
  return comp;
}

/**
 * Agenda o que for do ano informado:
 *  - se ANO+1 é olímpico: as etapas por RANKING (3/dez) e GRAND SLAM (17/dez)
 *    deste ano, que travam vagas do próximo ciclo;
 *  - se ESTE ano é olímpico: os 5 torneios continentais (fev–abr) e os Jogos.
 * @returns {Array} competições criadas.
 */
export function scheduleOlympics(world, idGen, opts = {}) {
  const { year, categoryFilter = MEN_IDS } = opts;
  const created = [];

  if (isOlympicYear(year + 1)) {
    const cfg = getOlympicConfig(year + 1);
    created.push(
      scheduleQualPaper(world, idGen, {
        type: "olympic-ranking-qual",
        name: `WT Olympic Ranking — ${year + 1} Qualification`,
        date: `${cfg.ranking.year}-${cfg.ranking.mmdd}`,
        categoryIds: categoryFilter,
        olympicYear: year + 1,
      })
    );
    created.push(
      scheduleQualPaper(world, idGen, {
        type: "olympic-grandslam-qual",
        name: `WT Grand Slam — ${year + 1} Olympic Quota`,
        date: `${cfg.grandSlam.year}-${cfg.grandSlam.mmdd}`,
        categoryIds: categoryFilter,
        olympicYear: year + 1,
      })
    );
  }

  if (isOlympicYear(year)) {
    const cfg = getOlympicConfig(year);
    for (const cont of cfg.continental) {
      const comp = createCompetition({
        id: idGen.next("COMP"),
        name: continentalQualName(year, cont.region),
        gRank: cfg.gRank, // dummy; torneio classificatório não pontua no ranking
        date: `${year}-${cont.mmdd}`,
        categoryIds: categoryFilter,
        location: null,
        fieldSize: null,
        type: "olympic-continental-qual",
      });
      comp.olympicContinent = cont.code;
      comp.olympicQuota = cont.quota;
      comp.olympicYear = year;
      scheduleCompetition(world, idGen, comp);
      created.push(comp);
    }
    // Verificação final (15 dias antes dos Jogos): fecha o campo (país-sede +
    // Comissão Tripartite) e faz a substituição de lesionados.
    created.push(
      scheduleQualPaper(world, idGen, {
        type: "olympic-final-check",
        name: `Confirmação Olímpica ${year}`,
        date: `${year}-07-15`,
        categoryIds: categoryFilter,
        olympicYear: year,
      })
    );
    const games = createCompetition({
      id: idGen.next("COMP"),
      name: cfg.gamesName,
      gRank: cfg.gRank,
      date: cfg.gamesDate,
      categoryIds: categoryFilter,
      location: cfg.host ? cfg.host.city : null,
      fieldSize: cfg.fieldPerCategory,
      type: "olympic-games",
    });
    games.olympicYear = year;
    scheduleCompetition(world, idGen, games);
    created.push(games);
  }

  return created;
}

// ---- Etapa 1: Ranking Olímpico ------------------------------------------------

export function runOlympicRankingQual(world, competition) {
  const year = competition.olympicYear;
  const cfg = getOlympicConfig(year);
  for (const cat of competition.categoryIds) {
    const ranked = athletesInCategory(world, cat)
      .filter((a) => a.status === ATHLETE_STATUS.ACTIVE)
      .sort(byRanking);
    // Congela a ORDEM do ranking em 3/dez do ano anterior — usada como último
    // critério na substituição por lesão.
    (((world.olympicRankingSnapshot ||= {})[year] ||= {})[cat] = ranked.map((a) => a.id));
    let taken = 0;
    for (const a of ranked) {
      if (taken >= cfg.ranking.qualifiers) break;
      if (addQuota(world, year, cat, a.id, cfg.ranking.method, cfg)) taken += 1;
    }
  }
}

// ---- Etapa 2 (parte A): Grand Slam --------------------------------------------

export function runOlympicGrandSlamQual(world, competition) {
  const year = competition.olympicYear;
  const cfg = getOlympicConfig(year);
  for (const cat of competition.categoryIds) {
    // Ranking de Mérito na data do evento (17/dez do ano anterior).
    const merit = grandSlamMeritRanking(world, cat, competition.date);
    for (const { athleteId } of merit) {
      const a = world.athletes[athleteId];
      if (!a || a.status !== ATHLETE_STATUS.ACTIVE) continue;
      // 1 vaga; escorrega ao próximo do mérito se já classificado/país com vaga.
      if (addQuota(world, year, cat, athleteId, cfg.grandSlam.method, cfg)) break;
    }
  }
}

// ---- Etapa 2 (parte B): Torneios Continentais ---------------------------------

/** Campo de um torneio continental: continente, não classificados, 1/país. */
export function continentalQualParticipants(world, competition, categoryId) {
  const year = competition.olympicYear;
  const cont = competition.olympicContinent;
  const pool = athletesInCategory(world, categoryId).filter((a) => {
    const code = countryCodeOf(world, a.id);
    if (continentOf(code) !== cont) return false;
    if (isQualifiedInCategory(world, year, categoryId, a.id)) return false;
    if (countryHasQuota(world, year, categoryId, code)) return false;
    return true;
  });
  return oneBestPerCountry(world, pool).sort(byRanking);
}

/** Concede as vagas continentais aos finalistas (ou ao campeão, se quota 1). */
export function assignContinentalQuotas(world, competition, byCategory) {
  const year = competition.olympicYear;
  const cfg = getOlympicConfig(year);
  const method = `continental:${competition.olympicContinent}`;
  for (const [cat, placements] of Object.entries(byCategory)) {
    const ordered = [...placements].sort((a, b) => a.placement - b.placement);
    let taken = 0;
    for (const p of ordered) {
      if (taken >= competition.olympicQuota) break;
      if (addQuota(world, year, cat, p.athleteId, method, cfg)) taken += 1;
    }
  }
}

// ---- Etapas 3 e 4: País-sede e Comissão Tripartite ----------------------------

/** Países abaixo da posição `rank` no ranking de países (por pontos). @returns códigos IOC. */
function countriesBelowRank(world, rank) {
  return Object.values(world.countries)
    .filter((c) => (c.athleteIds?.length || 0) > 0)
    .sort((a, b) => (b.statistics?.rankingPoints ?? 0) - (a.statistics?.rankingPoints ?? 0))
    .slice(rank)
    .map((c) => c.code);
}

function fillTripartite(world, year, cat, cfg, hostContinent, random) {
  const t = cfg.tripartite;
  // 1) melhor não classificado.
  if (t.best && !categoryFull(world, year, cat, cfg)) {
    const best = unqualifiedPool(world, year, cat).sort(byRanking)[0];
    if (best) addQuota(world, year, cat, best.id, "tripartite:best", cfg);
  }
  // 2) melhor do continente-sede.
  if (t.hostContinent && hostContinent && !categoryFull(world, year, cat, cfg)) {
    const best = unqualifiedPool(world, year, cat)
      .filter((a) => continentOf(countryCodeOf(world, a.id)) === hostContinent)
      .sort(byRanking)[0];
    if (best) addQuota(world, year, cat, best.id, "tripartite:host-continent", cfg);
  }
  // 3) melhor de um país aleatório abaixo da posição N do ranking de países.
  if (t.randomCountry && !categoryFull(world, year, cat, cfg)) {
    const codes = random.shuffle(countriesBelowRank(world, cfg.tripartite.countryRankBelow));
    for (const code of codes) {
      if (categoryFull(world, year, cat, cfg)) break;
      const best = unqualifiedPool(world, year, cat)
        .filter((a) => countryCodeOf(world, a.id) === code)
        .sort(byRanking)[0];
      if (best && addQuota(world, year, cat, best.id, "tripartite:random", cfg)) break;
    }
  }
  // Segurança: se ainda faltar (roster pequeno), completa com melhores restantes.
  while (!categoryFull(world, year, cat, cfg)) {
    const best = unqualifiedPool(world, year, cat).sort(byRanking)[0];
    if (!best || !addQuota(world, year, cat, best.id, "tripartite:fill", cfg)) break;
  }
}

/**
 * Fecha o campo dos Jogos: concede as vagas de país-sede e da Comissão
 * Tripartite (completa até 16 por categoria). Chamado uma vez antes de simular.
 */
export function finalizeOlympicField(world, competition, random) {
  const year = competition.olympicYear;
  const cfg = getOlympicConfig(year);
  const cats = competition.categoryIds;

  // Etapa 3 — País-sede: até `quota` melhores atletas da sede, em categorias
  // distintas onde a sede ainda não tem vaga.
  if (cfg.host && cfg.hostRule.quota > 0) {
    const hostCode = cfg.host.country;
    const candidates = [];
    for (const cat of cats) {
      if (countryHasQuota(world, year, cat, hostCode) || categoryFull(world, year, cat, cfg)) continue;
      const best = athletesInCategory(world, cat)
        .filter(
          (a) =>
            a.status === ATHLETE_STATUS.ACTIVE &&
            countryCodeOf(world, a.id) === hostCode &&
            !isQualifiedInCategory(world, year, cat, a.id)
        )
        .sort(byRanking)[0];
      if (best) candidates.push({ cat, athlete: best });
    }
    candidates.sort((x, y) => byRanking(x.athlete, y.athlete));
    let taken = 0;
    const usedCats = new Set();
    for (const { cat, athlete } of candidates) {
      if (taken >= cfg.hostRule.quota) break;
      if (usedCats.has(cat)) continue;
      if (addQuota(world, year, cat, athlete.id, "host", cfg)) {
        taken += 1;
        usedCats.add(cat);
      }
    }
  }

  // Etapa 4 — Comissão Tripartite: completa cada categoria até 16.
  const hostContinent = cfg.host ? continentOf(cfg.host.country) : null;
  for (const cat of cats) fillTripartite(world, year, cat, cfg, hostContinent, random);
}

/** Atletas classificados de uma categoria (para o chaveamento dos Jogos), por ranking. */
export function resolveOlympicEntrants(world, competition, categoryId) {
  const year = competition.olympicYear;
  return categoryQuotas(world, year, categoryId)
    .map((q) => world.athletes[q.athleteId])
    .filter((a) => a && a.status === ATHLETE_STATUS.ACTIVE)
    .sort(byRanking);
}

/** Método de classificação de um atleta (para exibição), ou null. */
export function quotaMethodOf(world, year, categoryId, athleteId) {
  return categoryQuotas(world, year, categoryId).find((q) => q.athleteId === athleteId)?.method || null;
}

// ---- Substituição por lesão (15 dias antes dos Jogos) -------------------------

const OLYMPIC_TOP_RANK = 20; // "Top-20" para herdar a vaga pela seleção nacional

/**
 * Encontra o substituto de uma vaga perdida por lesão:
 *  1) Seleção Nacional do país (campeão da seletiva → vice → reservas), se
 *     Top-20 do ranking, ativo e ainda não classificado;
 *  2) senão, o melhor do ranking de 3/dez do ano anterior que não se classificou
 *     e cujo país não tem atleta classificado na categoria.
 * @returns {{ athleteId: string, via: string }|null}
 */
function findOlympicReplacement(world, year, categoryId, injuredId) {
  const code = countryCodeOf(world, injuredId);
  const eligible = (id) =>
    world.athletes[id] &&
    id !== injuredId &&
    world.athletes[id].status === ATHLETE_STATUS.ACTIVE &&
    !isQualifiedInCategory(world, year, categoryId, id);

  // 1) Seleção Nacional (titulares e depois reservas), Top-20.
  const team = world.nationalTeams?.[code]?.[categoryId];
  if (team) {
    for (const id of [...(team.titulares || []), ...(team.reservas || [])]) {
      if (!eligible(id)) continue;
      if ((world.athletes[id].ranking?.position ?? Infinity) > OLYMPIC_TOP_RANK) continue;
      return { athleteId: id, via: "national" };
    }
  }

  // 2) Melhor do ranking de 3/dez que não classificou e de país sem vaga.
  const order =
    world.olympicRankingSnapshot?.[year]?.[categoryId] ||
    athletesInCategory(world, categoryId).sort(byRanking).map((a) => a.id);
  for (const id of order) {
    if (!eligible(id)) continue;
    if (countryHasQuota(world, year, categoryId, countryCodeOf(world, id))) continue;
    return { athleteId: id, via: "ranking" };
  }
  return null;
}

/**
 * Verificação de lesões dos classificados (15 dias antes dos Jogos): um
 * classificado lesionado que não se recupera até a data perde a vaga (gera
 * notícia); a vaga é herdada pelo substituto (gera notícia). Ver docs/OLYMPICS.md.
 * @returns {Array} eventos { type, athleteId, categoryId } para o Director emitir.
 */
export function runOlympicInjuryReplacement(world, competition) {
  const year = competition.olympicYear;
  const cfg = getOlympicConfig(year);
  const date = competition.date; // 15 dias antes dos Jogos (o prazo de recuperação)
  const events = [];

  for (const cat of competition.categoryIds) {
    const bucket = categoryQuotas(world, year, cat);
    for (const q of [...bucket]) {
      const a = world.athletes[q.athleteId];
      // Lesionado e sem recuperação até o prazo (15 dias antes) → perde a vaga.
      const injured =
        a &&
        a.status === ATHLETE_STATUS.INJURED &&
        a.condition?.injuredUntil &&
        a.condition.injuredUntil > date;
      if (!injured) continue;

      const idx = bucket.findIndex((x) => x.athleteId === q.athleteId);
      if (idx >= 0) bucket.splice(idx, 1);
      pushNews(world, {
        type: "olympic-forfeit",
        date,
        athleteId: q.athleteId,
        categoryId: cat,
        competitionName: cfg.gamesName,
      });
      events.push({ type: "forfeit", athleteId: q.athleteId, categoryId: cat });

      const rep = findOlympicReplacement(world, year, cat, q.athleteId);
      if (rep && addQuota(world, year, cat, rep.athleteId, "replacement", cfg)) {
        pushNews(world, {
          type: "olympic-replacement",
          date,
          athleteId: rep.athleteId,
          replacedId: q.athleteId,
          categoryId: cat,
          via: rep.via,
          competitionName: cfg.gamesName,
        });
        events.push({ type: "replacement", athleteId: rep.athleteId, categoryId: cat });
      }
    }
  }
  return events;
}
