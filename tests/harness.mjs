/**
 * Micro test harness (sem dependências).
 * Coleta testes, executa e reporta. Sai com código != 0 se algo falhar.
 */

const tests = [];
let currentSuite = "";

export function suite(name) {
  currentSuite = name;
}

export function test(name, fn) {
  tests.push({ name: `${currentSuite ? currentSuite + " › " : ""}${name}`, fn });
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert falhou");
}

export function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg || "esperava igualdade"}\n  esperado: ${e}\n  obtido:   ${a}`);
  }
}

export function assertClose(actual, expected, tol, msg) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(
      `${msg || "fora da tolerância"}: |${actual} - ${expected}| > ${tol}`
    );
  }
}

export async function runAll() {
  let passed = 0;
  const failures = [];
  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failures.push({ name: t.name, err });
      console.log(`  ✗ ${t.name}`);
    }
  }
  console.log(`\n${passed}/${tests.length} testes passaram.`);
  if (failures.length) {
    console.log("\nFalhas:");
    for (const f of failures) {
      console.log(`\n  ✗ ${f.name}\n    ${f.err.message.replace(/\n/g, "\n    ")}`);
    }
    process.exitCode = 1;
  }
  return failures.length === 0;
}
