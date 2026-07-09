/**
 * Utilitários de data (ISO-8601, UTC) — determinísticos e sem dependências.
 */

/** Avança uma data ISO "YYYY-MM-DD" em `days` dias. */
export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Ano de uma data ISO. */
export function yearOf(isoDate) {
  return Number(isoDate.slice(0, 4));
}
