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

/** Meses inteiros decorridos de `fromISO` até `toISO` (>= 0). */
export function monthsBetween(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1; // ainda não completou o mês
  return Math.max(0, months);
}
