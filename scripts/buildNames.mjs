/**
 * Build de nomes (executado em tempo de desenvolvimento, não em runtime).
 *
 * Lê os arquivos grandes de referência da raiz do repositório:
 *   - common-forenames-by-country.json  (~523 KB)
 *   - common-surnames-by-country.json   (~389 KB)
 *
 * e gera um dicionário compacto em src/database/names.js contendo, por país,
 * apenas arrays de strings romanizadas: nomes (do gênero configurado) e
 * sobrenomes. Assim o custo de parsear ~900 KB ocorre só aqui; em runtime o
 * jogo carrega um arquivo pequeno e sorteia nomes em O(1). Ver DECISIONS.md.
 *
 * Uso: npm run build:names
 *
 * Para escalar (mais países / gênero feminino), edite COUNTRIES / GENDERS
 * abaixo e rode novamente.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// --- Configuração do build ---------------------------------------------------
// Seed inicial: apenas masculino e países presentes nos DOIS arquivos de nomes.
const COUNTRIES = ["KR", "TR", "BR", "CN"];
const GENDERS = ["M"]; // feminino adiado (ver TODO.md)
// ----------------------------------------------------------------------------

function loadJSON(name) {
  return JSON.parse(readFileSync(join(root, name), "utf8"));
}

/** Remove duplicatas preservando a ordem (por rank) de aparição. */
function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (item && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function extractForenames(foreData, country, genders) {
  const blocks = foreData[country] || [];
  const names = [];
  for (const block of blocks) {
    for (const entry of block.names || []) {
      if (!genders.includes(entry.gender)) continue;
      const rom = entry.romanized && entry.romanized[0];
      if (rom) names.push(rom);
    }
  }
  return dedupe(names);
}

function extractSurnames(surData, country) {
  const entries = surData[country] || [];
  const names = [];
  for (const entry of entries) {
    const rom = entry.romanized && entry.romanized[0];
    if (rom) names.push(rom);
  }
  return dedupe(names);
}

function build() {
  const fore = loadJSON("common-forenames-by-country.json");
  const sur = loadJSON("common-surnames-by-country.json");

  const out = {};
  const report = [];
  for (const country of COUNTRIES) {
    const forenames = extractForenames(fore, country, GENDERS);
    const surnames = extractSurnames(sur, country);
    if (forenames.length === 0 || surnames.length === 0) {
      throw new Error(
        `País ${country} sem nomes suficientes (forenames=${forenames.length}, surnames=${surnames.length}).`
      );
    }
    out[country] = { forenames, surnames };
    report.push(`${country}: ${forenames.length} nomes × ${surnames.length} sobrenomes`);
  }

  const header = `/**
 * Dicionário de nomes compacto — GERADO por scripts/buildNames.mjs.
 * NÃO editar à mão. Rode "npm run build:names" para regenerar.
 *
 * Gênero(s): ${GENDERS.join(", ")} | Países: ${COUNTRIES.join(", ")}
 * Apenas grafias romanizadas. Consumido pelo nameGenerator em runtime.
 */
`;
  const body = `export const NAMES = ${JSON.stringify(out, null, 2)};\n`;
  const target = join(root, "src", "database", "names.js");
  writeFileSync(target, header + "\n" + body, "utf8");

  console.log("names.js gerado:");
  for (const line of report) console.log("  " + line);
  const bytes = Buffer.byteLength(header + body, "utf8");
  console.log(`  arquivo: ${(bytes / 1024).toFixed(1)} KB (vs ~890 KB de origem)`);
}

build();
