/**
 * Testes do Passo 1 — Serviços de base:
 * RandomSystem, EventBus, StorageService.
 */

import { suite, test, assert, assertEqual, assertClose } from "./harness.mjs";
import { RandomSystem } from "../src/services/random.js";
import { EventBus } from "../src/services/eventBus.js";
import { StorageService, MemoryBackend } from "../src/services/storage.js";

suite("RandomSystem");

test("é determinístico: mesma seed → mesma sequência", () => {
  const a = new RandomSystem(12345);
  const b = new RandomSystem(12345);
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assertEqual(seqA, seqB, "sequências deveriam ser idênticas");
});

test("seeds diferentes → sequências diferentes", () => {
  const a = new RandomSystem(1);
  const b = new RandomSystem(2);
  assert(a.next() !== b.next(), "seeds distintas não deveriam coincidir no 1º valor");
});

test("next() fica sempre em [0,1)", () => {
  const r = new RandomSystem("taekwondo");
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert(v >= 0 && v < 1, `valor fora do intervalo: ${v}`);
  }
});

test("int() respeita limites inclusivos", () => {
  const r = new RandomSystem(7);
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < 5000; i++) {
    const v = r.int(1, 6);
    assert(Number.isInteger(v), "int deveria ser inteiro");
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  assertEqual([min, max], [1, 6], "deveria cobrir exatamente 1..6");
});

test("chance(p) aproxima a frequência p", () => {
  const r = new RandomSystem(99);
  let hits = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (r.chance(0.3)) hits++;
  assertClose(hits / N, 0.3, 0.02, "frequência de chance(0.3) fora do esperado");
});

test("weighted respeita proporção 70/30", () => {
  const r = new RandomSystem(2024);
  let a = 0, b = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const v = r.weighted(["A", "B"], [70, 30]);
    if (v === "A") a++; else b++;
  }
  assertClose(a / N, 0.7, 0.02, "peso de A fora do esperado");
});

test("gaussian aproxima média e desvio", () => {
  const r = new RandomSystem(555);
  const N = 20000;
  let sum = 0;
  const vals = [];
  for (let i = 0; i < N; i++) {
    const v = r.gaussian(50, 10);
    vals.push(v);
    sum += v;
  }
  const mean = sum / N;
  const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / N;
  assertClose(mean, 50, 0.5, "média fora do esperado");
  assertClose(Math.sqrt(variance), 10, 0.5, "desvio fora do esperado");
});

test("getState/setState permite retomar a sequência", () => {
  const r = new RandomSystem(42);
  for (let i = 0; i < 10; i++) r.next();
  const snapshot = r.getState();
  const expected = Array.from({ length: 5 }, () => r.next());
  r.setState(snapshot);
  const resumed = Array.from({ length: 5 }, () => r.next());
  assertEqual(resumed, expected, "retomar do estado deveria repetir a sequência");
});

test("aceita seed em string de forma estável", () => {
  const a = new RandomSystem("mundo-A");
  const b = new RandomSystem("mundo-A");
  assertEqual(a.next(), b.next(), "seed em string deveria ser estável");
});

suite("EventBus");

test("entrega evento aos listeners inscritos", () => {
  const bus = new EventBus();
  let received = null;
  bus.on("FightFinished", (e) => { received = e; });
  bus.publish("FightFinished", { winnerId: "A-1" }, { source: "CombatEngine" });
  assert(received !== null, "listener não recebeu o evento");
  assertEqual(received.payload.winnerId, "A-1");
  assertEqual(received.source, "CombatEngine");
  assert(received.eventId.startsWith("EVT-"), "evento deveria ter ID");
});

test("respeita prioridade (maior primeiro)", () => {
  const bus = new EventBus();
  const order = [];
  bus.on("X", () => order.push("baixa"), 0);
  bus.on("X", () => order.push("alta"), 10);
  bus.on("X", () => order.push("media"), 5);
  bus.publish("X");
  assertEqual(order, ["alta", "media", "baixa"], "ordem de prioridade incorreta");
});

test("off() cancela a inscrição", () => {
  const bus = new EventBus();
  let count = 0;
  const off = bus.on("Y", () => count++);
  bus.publish("Y");
  off();
  bus.publish("Y");
  assertEqual(count, 1, "listener não foi removido");
});

test("once() executa apenas uma vez", () => {
  const bus = new EventBus();
  let count = 0;
  bus.once("Z", () => count++);
  bus.publish("Z");
  bus.publish("Z");
  assertEqual(count, 1, "once deveria disparar só uma vez");
});

test("listener sem inscritos não quebra", () => {
  const bus = new EventBus();
  bus.publish("Inexistente", { a: 1 });
  assert(true);
});

suite("StorageService");

test("salva e carrega objetos via JSON", () => {
  const s = new StorageService(new MemoryBackend());
  s.save("world", { date: "2028-01-01", athletes: 3 });
  const loaded = s.load("world");
  assertEqual(loaded, { date: "2028-01-01", athletes: 3 });
});

test("load retorna fallback quando ausente", () => {
  const s = new StorageService(new MemoryBackend());
  assertEqual(s.load("nada", { ok: false }), { ok: false });
});

test("has() e remove() funcionam", () => {
  const s = new StorageService(new MemoryBackend());
  s.save("k", 1);
  assert(s.has("k"), "deveria existir");
  s.remove("k");
  assert(!s.has("k"), "deveria ter sido removido");
});

test("namespaces isolam chaves", () => {
  const backend = new MemoryBackend();
  const a = new StorageService(backend, "a");
  const b = new StorageService(backend, "b");
  a.save("x", 1);
  b.save("x", 2);
  assertEqual(a.load("x"), 1);
  assertEqual(b.load("x"), 2);
});
