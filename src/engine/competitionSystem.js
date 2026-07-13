/**
 * Competition System — monta chaves, roda as lutas e apura resultados.
 * (simulation_director.md §7). NUNCA decide quem vence: delega ao Combat Engine.
 *
 * Produz, por categoria, a colocação de cada atleta e a medalha, seguindo a
 * eliminação simples. Colocação pela rodada de eliminação:
 *   campeão=1, vice=2, semifinalistas=3 (dois bronzes, padrão WT), QF=5, R16=9…
 *
 * Repescagem olímpica (dois bronzes por chaves separadas) fica adiada
 * (taekwondo-ranking.md §7 → TODO.md); aqui os dois semifinalistas derrotados
 * recebem bronze diretamente.
 */

import { buildBracket } from "./brackets.js";
import { simulateFight } from "./combat/fightManager.js";
import { combatRating } from "./combat/probability.js";
import { buildFightersWithForm } from "./form.js";

/** Colocação de quem perde numa rodada com `roundSize` atletas. */
function placementForRound(roundSize) {
  return roundSize / 2 + 1;
}

function medalForPlacement(placement) {
  if (placement === 1) return "ouro";
  if (placement === 2) return "prata";
  if (placement === 3) return "bronze";
  return null;
}

/**
 * Seleciona os inscritos de uma categoria: os melhores ranqueados até fieldSize.
 * fieldSize null/0 = todos.
 */
export function selectEntrants(athletes, fieldSize) {
  if (!fieldSize || athletes.length <= fieldSize) return athletes;
  return seedByRanking(athletes).slice(0, fieldSize);
}

/** Ordena atletas por ranking (pontos desc; desempate por rating combativo). */
function seedByRanking(athletes) {
  return [...athletes].sort((a, b) => {
    const pa = a.ranking?.points ?? 0;
    const pb = b.ranking?.points ?? 0;
    if (pb !== pa) return pb - pa;
    return combatRating(b.attributes) - combatRating(a.attributes);
  });
}

/** Round-sentinela da disputa de 3º lugar (não é potência de dois). */
export const THIRD_PLACE_ROUND = 3;

/**
 * Simula uma categoria inteira (uma chave).
 * @param {object} random  RandomSystem
 * @param {Array} athletes atletas inscritos na categoria
 * @param {object} [opts] { fightFn, onMatch, preseeded, thirdPlaceMatch }
 *   - preseeded: usa a ORDEM recebida como seeding (não reordena por ranking).
 *   - thirdPlaceMatch: joga a disputa de bronze entre os semifinalistas
 *     derrotados (um único 3º e um 4º distinto), em vez dos dois bronzes padrão.
 * @returns {{ placements: Array, matches: Array }}
 */
export function simulateCategory(random, athletes, opts = {}) {
  const fightFn = opts.fightFn || simulateFight;
  const onMatch = opts.onMatch || null;
  // Visões ajustadas por forma (id → atleta com atributos do dia). Opcional:
  // a chave/bracket usa os atletas verdadeiros; as lutas usam as visões.
  const fighters = opts.fighters || null;
  const fighterOf = (a) => (fighters && fighters.get(a.id)) || a;
  // Consulta a rivalidade (0..1) entre dois atletas, se fornecida.
  const rivalryOf = opts.rivalryLookup || (() => 0);
  const thirdPlaceMatch = !!opts.thirdPlaceMatch;

  if (athletes.length === 0) return { placements: [], matches: [] };
  if (athletes.length === 1) {
    return {
      placements: [{ athleteId: athletes[0].id, placement: 1, medal: "ouro" }],
      matches: [],
    };
  }

  // preseeded: o chamador já entregou os atletas na ordem de seeding desejada
  // (ex.: Grand Slam Finals — cabeças-de-chave forçados). Caso contrário, semeia
  // pelo ranking vigente.
  const ranked = opts.preseeded ? [...athletes] : seedByRanking(athletes);
  const { slots } = buildBracket(ranked);

  const placements = [];
  const matches = [];
  const semifinalLosers = []; // coletados para a disputa de bronze, se ligada
  let current = slots; // pode conter null (byes)
  let roundSize = current.length;

  const runFight = (a, b, round) => {
    const rivalry = rivalryOf(a.id, b.id);
    const result = fightFn(random, fighterOf(a), fighterOf(b), { rivalry });
    const winner = result.winnerId === a.id ? a : b;
    const loser = result.winnerId === a.id ? b : a;
    const match = {
      round,
      athleteAId: a.id,
      athleteBId: b.id,
      winnerId: winner.id,
      rounds: result.rounds,
      rivalry,
    };
    matches.push(match);
    if (onMatch) onMatch(match, result);
    return { winner, loser };
  };

  while (roundSize > 1) {
    const winners = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];

      if (a && b) {
        const { winner, loser } = runFight(a, b, roundSize);
        // Semifinal (roundSize 4) com disputa de bronze: segura os perdedores
        // para o playoff em vez de dar dois bronzes diretos.
        if (thirdPlaceMatch && roundSize === 4) {
          semifinalLosers.push(loser);
        } else {
          placements.push({
            athleteId: loser.id,
            placement: placementForRound(roundSize),
            medal: medalForPlacement(placementForRound(roundSize)),
          });
        }
        winners.push(winner);
      } else {
        // Bye: o atleta presente avança sem luta.
        winners.push(a || b);
      }
    }
    current = winners;
    roundSize = winners.length;
  }

  // Campeão.
  const champion = current[0];
  placements.push({ athleteId: champion.id, placement: 1, medal: "ouro" });

  // Disputa de 3º lugar: os dois semifinalistas derrotados jogam; vencedor = 3º
  // (bronze único), perdedor = 4º. Só dispara com exatamente dois semifinalistas.
  if (thirdPlaceMatch && semifinalLosers.length === 2) {
    const { winner, loser } = runFight(semifinalLosers[0], semifinalLosers[1], THIRD_PLACE_ROUND);
    placements.push({ athleteId: winner.id, placement: 3, medal: "bronze" });
    placements.push({ athleteId: loser.id, placement: 4, medal: null });
  } else if (thirdPlaceMatch && semifinalLosers.length === 1) {
    // Chave pequena (bye na semifinal): o único semifinalista derrotado leva o bronze.
    placements.push({ athleteId: semifinalLosers[0].id, placement: 3, medal: "bronze" });
  }

  // Ordena por colocação (melhor primeiro) para leitura estável.
  placements.sort((x, y) => x.placement - y.placement);
  return { placements, matches };
}

/**
 * Simula uma competição inteira (todas as categorias).
 * @param {object} random
 * @param {object} competition  entidade Competition
 * @param {(categoryId: string) => Array} getAthletes  fornece inscritos por categoria
 * @param {object} [opts]
 * @returns {{ byCategory: Object, allMatches: Array }}
 */
export function simulateCompetition(random, competition, getAthletes, opts = {}) {
  const byCategory = {};
  const allMatches = [];
  const useForm = opts.applyForm !== false; // Form System ligado por padrão
  for (const categoryId of competition.categoryIds) {
    const athletes = getAthletes(categoryId);
    // Form System: sorteia a forma do dia de cada inscrito (uma vez por evento)
    // e monta as visões de combate. A chave/seeding usa os atletas verdadeiros.
    const fighters = useForm ? buildFightersWithForm(athletes, competition, random) : null;
    const { placements, matches } = simulateCategory(random, athletes, { ...opts, fighters });
    byCategory[categoryId] = placements;
    for (const m of matches) allMatches.push({ ...m, categoryId });
  }
  return { byCategory, allMatches };
}
