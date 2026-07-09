/**
 * Build do calendário 2026 (build-time; não roda no jogo).
 *
 * Lê "2026 Events.txt" (calendário oficial WT em texto) e gera
 * src/database/calendar2026.js com os eventos Kyorugi/Senior.
 *
 * O texto tem células mescladas: o Título aparece nas linhas seguintes a uma
 * linha de evento terminada em TAB, e vale para o grupo de linhas até o próximo
 * bloco de título. O parser reconstrói essa associação.
 *
 * Filtro: mantém disciplinas Kyorugi de nível Senior (inclui "Kyorugi" puro dos
 * Grand Prix) e descarta Junior, Cadet, Poomsae, Virtual, Team e Grand Slam
 * (formatos fora do escopo — ver TODO.md). Uso: npm run build:calendar
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const MONTHS = {
  january: 1, february: 2, feburary: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const MEN = ["WC-M-58", "WC-M-68", "WC-M-80", "WC-M-80+"];

const rowRe = /^(January|February|Feburary|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i;

function isRow(line) {
  return rowRe.test(line) && line.includes("\t");
}
function isMonthHeader(line) {
  return /^[A-Z]{3,}$/.test(line.trim()) && MONTHS[line.trim().toLowerCase()] !== undefined;
}
function isHeaderRow(line) {
  return /^Date\t/.test(line);
}

/** Converte "February 11-14" / "April 12 - 17" → ISO da data inicial (2026). */
function toISO(dateField) {
  const m = dateField.match(rowRe);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = Number(m[2]);
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Mantém disciplinas Kyorugi Senior (inclui "Kyorugi" puro dos Grand Prix). */
function isSeniorKyorugi(discipline) {
  const d = discipline.toLowerCase();
  if (!d.includes("kyorugi")) return false;
  if (d.includes("junior") || d.includes("cadet")) return false;
  if (d.includes("poomsae") || d.includes("virtual") || d.includes("team")) return false;
  return true; // "kyorugi / senior" ou "kyorugi" (grand prix)
}

function build() {
  const raw = readFileSync(join(root, "2026 Events.txt"), "utf8");
  const lines = raw.split(/\r?\n/);

  let currentTitle = null;
  let currentLocation = null;
  const events = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (isMonthHeader(line) || isHeaderRow(line)) {
      currentTitle = null;
      currentLocation = null;
      continue;
    }
    if (isRow(line)) {
      const endsTab = /\t\s*$/.test(line);
      const fields = line.split("\t");
      const dateField = fields[0].trim();
      const discipline = (fields[1] || "").trim();
      const grade = (fields[2] || "").trim();

      if (endsTab) {
        // Lê o bloco de título/localização nas linhas seguintes.
        const block = [];
        let j = i + 1;
        while (
          j < lines.length &&
          lines[j].trim() !== "" &&
          !isRow(lines[j]) &&
          !isMonthHeader(lines[j]) &&
          !isHeaderRow(lines[j])
        ) {
          block.push(lines[j].replace(/\t/g, "").trim());
          j++;
        }
        currentTitle = block[0] || currentTitle;
        currentLocation = block.slice(1).join(" ").replace(/\s*,\s*$/, "") || null;
        i = j - 1;
      }

      const title = currentTitle || "";
      // Exclui formatos/escopos fora: Grand Slam (invitational) e eventos
      // exclusivamente femininos (mundo masculino no escopo atual).
      const excludedByName = /grand slam|women/i.test(title);
      if (isSeniorKyorugi(discipline) && /^G-\d+$/.test(grade) && !excludedByName) {
        events.push({
          date: toISO(dateField),
          gRank: grade,
          name: title || "(sem título)",
          location: currentLocation,
        });
      }
    }
  }

  // Dedup por nome (mantém a primeira ocorrência sênior) e ordena por data.
  const seen = new Set();
  const deduped = [];
  for (const e of events.sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const key = e.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  const byG = deduped.reduce((m, e) => ((m[e.gRank] = (m[e.gRank] || 0) + 1), m), {});

  const header = `/**
 * Calendário oficial 2026 — Kyorugi/Senior. GERADO por scripts/buildCalendar.mjs
 * a partir de "2026 Events.txt" (calendário oficial WT). NÃO editar à mão.
 *
 * Apenas Kyorugi Senior (inclui Grand Prix). Poomsae, Virtual, Junior, Cadet,
 * Team e Grand Slam ficam de fora (ver TODO.md). Todos disputam as 4 categorias
 * masculinas no escopo atual.
 */
`;
  const MENJSON = JSON.stringify(MEN);
  const list = deduped.map((e) => ({ ...e, categoryIds: MEN }));
  const body = `const MEN = ${MENJSON};\n\nexport const CALENDAR_2026 = ${JSON.stringify(
    list.map(({ categoryIds, ...rest }) => rest),
    null,
    0
  )}.map((e) => ({ ...e, categoryIds: MEN }));\n`;

  writeFileSync(join(root, "src", "database", "calendar2026.js"), header + "\n" + body, "utf8");
  console.log(`calendar2026.js gerado: ${deduped.length} eventos Kyorugi/Senior`);
  console.log(`  por G-Rank: ${JSON.stringify(byG)}`);
  console.log("  amostra:");
  for (const e of deduped.slice(0, 8)) console.log(`    ${e.date}  ${e.gRank.padEnd(4)}  ${e.name}`);
}

build();
