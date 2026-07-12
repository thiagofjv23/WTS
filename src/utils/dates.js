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

/** Dias decorridos de `fromISO` até `toISO` (pode ser negativo). */
export function daysBetween(fromISO, toISO) {
  const a = Date.UTC(...fromISO.split("-").map(Number).map((n, i) => (i === 1 ? n - 1 : n)));
  const b = Date.UTC(...toISO.split("-").map(Number).map((n, i) => (i === 1 ? n - 1 : n)));
  return Math.round((b - a) / 86400000);
}

/** Avança uma data ISO em `n` meses, ajustando o dia ao fim do mês se preciso. */
export function addMonths(isoDate, n) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + n, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Avança uma data ISO em `n` anos. */
export function addYears(isoDate, n) {
  return addMonths(isoDate, n * 12);
}

/** Meses inteiros decorridos de `fromISO` até `toISO` (>= 0). */
export function monthsBetween(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1; // ainda não completou o mês
  return Math.max(0, months);
}
