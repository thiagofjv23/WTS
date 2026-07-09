/**
 * Runner de testes. Importa todos os arquivos *.test.mjs e executa.
 * Uso: npm test  (ou: node tests/run.mjs)
 */

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runAll } from "./harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here)
  .filter((f) => f.endsWith(".test.mjs"))
  .sort();

console.log(`Executando ${files.length} arquivo(s) de teste:\n`);
for (const f of files) {
  await import(join(here, f));
}

await runAll();
