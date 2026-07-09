/**
 * Gerador de Chaves (Brackets) — taekwondo-ranking.md §6.
 *
 * - Mata-mata (eliminação simples).
 * - Tamanho ajustado à próxima potência de dois (2, 4, 8, 16, 32).
 * - Byes: se o nº de atletas não for potência de dois, os melhores ranqueados
 *   passam direto (recebem bye na 1ª rodada).
 *
 * Bloqueio de equipe/clube: adiado (sem entidade Club ainda — ver TODO.md).
 */

/** Menor potência de dois >= n (mínimo 2). */
export function nextPowerOfTwo(n) {
  if (n <= 2) return 2;
  return 2 ** Math.ceil(Math.log2(n));
}

/**
 * Ordem de seeds padrão para um bracket de `size` posições.
 * Garante que os melhores seeds fiquem em lados opostos e só se encontrem no
 * final. Ex.: size 8 → [1,8,4,5,2,7,3,6].
 */
export function standardSeedOrder(size) {
  let placements = [1, 2];
  while (placements.length < size) {
    const sum = placements.length * 2 + 1;
    const next = [];
    for (const p of placements) {
      next.push(p);
      next.push(sum - p);
    }
    placements = next;
  }
  return placements;
}

/**
 * Monta os slots da 1ª rodada. Atletas são semeados por ranking (melhor = seed 1).
 * Posições sem atleta viram BYE (null); pelo padrão de seeding, os byes caem
 * contra os melhores seeds, dando-lhes o avanço direto.
 *
 * @param {Array} rankedAthletes  atletas já ordenados do melhor para o pior.
 * @returns {{ size: number, slots: Array<object|null> }}
 */
export function buildBracket(rankedAthletes) {
  const n = rankedAthletes.length;
  const size = nextPowerOfTwo(n);
  const order = standardSeedOrder(size);
  const slots = order.map((seedNo) =>
    seedNo <= n ? rankedAthletes[seedNo - 1] : null
  );
  return { size, slots, byes: size - n };
}
