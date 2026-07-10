/**
 * News System (simulation_director.md §11).
 *
 * Transforma acontecimentos em notícias curtas guardadas em `world.news`
 * (append-only, limitado). A interface lê esse feed. Aqui não há regra de
 * negócio: apenas registro de fatos consumados.
 */

const MAX_NEWS = 400; // limita o crescimento do save (ver TODO)

/** Adiciona uma notícia ao feed, mantendo o tamanho sob o limite. */
export function pushNews(world, entry) {
  world.news.push(entry);
  if (world.news.length > MAX_NEWS) world.news.splice(0, world.news.length - MAX_NEWS);
}

export function newsInjury(world, date, athleteId, severity, until) {
  pushNews(world, { type: "injury", date, athleteId, severity, until });
}

export function newsRecovery(world, date, athleteId) {
  pushNews(world, { type: "recovery", date, athleteId });
}
