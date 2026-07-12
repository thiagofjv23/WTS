/**
 * Build do roster REAL (build-time; não roda no jogo).
 *
 * Lê o ranking oficial WT (12. Olympic_Kyorugi_Rankings_June_2026.xlsx) e gera
 * src/database/realRoster.js com os atletas reais das categorias masculinas:
 * nome, código IOC, país e pontos de ranking. O .xlsx (zip de XML) é lido só
 * aqui via parser próprio; em runtime o jogo carrega apenas o roster compacto.
 *
 * Uso: npm run build:roster
 * Para escalar (mais atletas ou categorias femininas), ajuste LIMIT/SHEETS.
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const XLSX = join(root, "12. Olympic_Kyorugi_Rankings_June_2026.xlsx");

// --- Configuração -----------------------------------------------------------
// Inclui TODOS os atletas rankeados por categoria (o ranking oficial inteiro).
// Use um número finito para voltar a limitar por TOP N (ver DECISIONS.md).
const LIMIT_PER_CATEGORY = Infinity;
// aba (1-based) → categoryId do simulador
const SHEETS = {
  1: "WC-M-58",
  2: "WC-M-68",
  3: "WC-M-80",
  4: "WC-M-80+",
};
// ----------------------------------------------------------------------------

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function unzip() {
  const dir = mkdtempSync(join(tmpdir(), "wt-xlsx-"));
  execSync(`unzip -o "${XLSX}" -d "${dir}"`, { stdio: "ignore" });
  return dir;
}

function loadStrings(dir) {
  const xml = readFileSync(join(dir, "xl/sharedStrings.xml"), "utf8");
  const out = [];
  const re = /<si>(.*?)<\/si>/gs;
  let m;
  while ((m = re.exec(xml))) {
    const text = [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((x) => x[1]).join("");
    out.push(decode(text));
  }
  return out;
}

function parseSheet(dir, n, strings) {
  const xml = readFileSync(join(dir, `xl/worksheets/sheet${n}.xml`), "utf8");
  const rows = {};
  const re = /<c r="([A-Z]+\d+)"(?:[^>]*?t="([^"]+)")?[^>]*>(?:<v>(.*?)<\/v>|<is><t[^>]*>(.*?)<\/t><\/is>)?<\/c>/gs;
  let m;
  while ((m = re.exec(xml))) {
    const ref = m[1], t = m[2], v = m[3], inl = m[4];
    let val = "";
    if (inl !== undefined) val = decode(inl);
    else if (v !== undefined) val = t === "s" ? strings[Number(v)] : v;
    const row = Number(ref.replace(/[A-Z]/g, ""));
    const col = ref.replace(/[0-9]/g, "");
    (rows[row] || (rows[row] = {}))[col] = val;
  }
  return rows;
}

/** Mapa cabeçalho→coluna a partir da 1ª linha. */
function headerMap(rows) {
  const map = {};
  for (const [col, val] of Object.entries(rows[1] || {})) map[(val || "").trim()] = col;
  return map;
}

/** Normaliza o nome (título) preservando hífens e apóstrofos. */
function normalizeName(raw) {
  return raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/** Extrai o código IOC do Member Number (ex.: "IRI-21260" → "IRI"). */
function iocFromMemberNumber(num) {
  const s = String(num || "").trim();
  const dash = s.indexOf("-");
  return dash > 0 ? s.slice(0, dash) : s.slice(0, 3);
}

// Colunas que NÃO são eventos (identidade e totais).
const NON_EVENT_HEADERS = new Set([
  "Rank", "Member Name", "Member Number", "Country", "Total Points",
  "Points From Previous Years in Ranking Cycle",
]);

// Pontos do campeão por G-Rank (taekwondo-ranking.md §1).
const G_TIERS = [
  { pts: 10, g: "G-1" },
  { pts: 20, g: "G-2" },
  { pts: 40, g: "G-4" },
  { pts: 80, g: "G-8" },
  { pts: 200, g: "G-20" },
];

/**
 * Infere o G-Rank de um evento pelo maior valor de pontos observado.
 * Regra robusta: menor tier cujo teto >= max observado (a regra de participação
 * da WT só REDUZ os pontos, nunca os infla). Ver análise em DECISIONS.md.
 */
function inferGRank(maxPoints) {
  for (const t of G_TIERS) if (maxPoints <= t.pts + 1e-6) return t.g;
  return "G-20";
}

/** Limpa prefixos de disciplina do nome do evento para exibição. */
function cleanEventName(name) {
  return name
    .replace(/^\((?:Kyorugi|Seniors?|Senior Kyorugi)\)\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function build() {
  const dir = unzip();
  try {
    const strings = loadStrings(dir);
    const roster = {};
    const countries = {}; // ioc → name
    const events = {}; // rawName → { maxPoints, categoryIds:Set }
    const report = [];

    for (const [sheetNo, categoryId] of Object.entries(SHEETS)) {
      const rows = parseSheet(dir, Number(sheetNo), strings);
      const h = headerMap(rows);
      const cRank = h["Rank"], cName = h["Member Name"], cNum = h["Member Number"];
      const cCountry = h["Country"], cTotal = h["Total Points"];

      // Colunas de eventos desta aba + maior pontuação observada.
      const eventCols = {};
      for (const [col, name] of Object.entries(rows[1] || {})) {
        const clean = (name || "").trim();
        if (clean && !NON_EVENT_HEADERS.has(clean)) eventCols[col] = clean;
      }
      const dataRows = Object.keys(rows).map(Number).filter((r) => r > 1);
      for (const [col, rawName] of Object.entries(eventCols)) {
        let max = 0;
        for (const rn of dataRows) {
          const raw = rows[rn][col];
          if (raw !== undefined && raw !== "") max = Math.max(max, parseFloat(raw) || 0);
        }
        if (max <= 0) continue;
        const ev = (events[rawName] ||= { maxPoints: 0, categoryIds: new Set() });
        ev.maxPoints = Math.max(ev.maxPoints, max);
        ev.categoryIds.add(categoryId);
      }

      const list = Object.keys(rows)
        .map(Number)
        .filter((r) => r > 1)
        .sort((a, b) => a - b)
        .map((rn) => {
          const r = rows[rn];
          const ioc = iocFromMemberNumber(r[cNum]);
          const country = (r[cCountry] || "").trim();
          if (country && ioc) countries[ioc] = country;
          return {
            name: normalizeName(r[cName] || ""),
            ioc,
            memberNumber: (r[cNum] || "").trim(),
            rank: parseInt(r[cRank], 10) || null,
            points: parseFloat(r[cTotal] || "0") || 0,
          };
        })
        .filter((a) => a.name && a.ioc)
        .sort((a, b) => b.points - a.points)
        .slice(0, LIMIT_PER_CATEGORY);

      roster[categoryId] = list;
      report.push(`${categoryId}: ${list.length} atletas (topo ${list[0]?.name} ${list[0]?.points})`);
    }

    const scope = Number.isFinite(LIMIT_PER_CATEGORY)
      ? `Top ${LIMIT_PER_CATEGORY} por categoria`
      : "TODOS os atletas rankeados por categoria";
    const header = `/**
 * Roster REAL — GERADO por scripts/buildRoster.mjs. NÃO editar à mão.
 * Fonte: ranking oficial World Taekwondo (Olympic Kyorugi, junho/2026).
 * ${scope} (masculino). Identidade e pontos reais;
 * idade e atributos são gerados no seed (ver DECISIONS.md).
 */
`;
    // Monta a lista de eventos com G-Rank inferido.
    const eventList = Object.entries(events)
      .map(([rawName, e]) => ({
        name: cleanEventName(rawName),
        gRank: inferGRank(e.maxPoints),
        categoryIds: [...e.categoryIds].sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const body =
      `export const REAL_COUNTRIES = ${JSON.stringify(countries, null, 0)};\n\n` +
      `export const REAL_ROSTER = ${JSON.stringify(roster, null, 0)};\n\n` +
      `export const REAL_EVENTS = ${JSON.stringify(eventList, null, 0)};\n`;
    const target = join(root, "src", "database", "realRoster.js");
    writeFileSync(target, header + "\n" + body, "utf8");

    const total = Object.values(roster).reduce((s, l) => s + l.length, 0);
    const byG = eventList.reduce((m, e) => ((m[e.gRank] = (m[e.gRank] || 0) + 1), m), {});
    console.log("realRoster.js gerado:");
    for (const line of report) console.log("  " + line);
    console.log(`  total: ${total} atletas, ${Object.keys(countries).length} países`);
    console.log(`  eventos: ${eventList.length} (${JSON.stringify(byG)})`);
    const bytes = Buffer.byteLength(header + body, "utf8");
    console.log(`  arquivo: ${(bytes / 1024).toFixed(1)} KB`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

build();
