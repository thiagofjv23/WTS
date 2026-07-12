/**
 * Bootstrap da aplicação (navegador).
 * Persistência preferencial em IndexedDB (cota grande, gravação assíncrona em
 * segundo plano); cai para localStorage e, por fim, memória. Monta o
 * GameController e inicia a interface.
 */

import { StorageService, LocalStorageBackend, MemoryBackend } from "./services/storage.js";
import { IndexedDBBackend } from "./services/idb.js";
import { GameController } from "./app/gameController.js";
import { App } from "./ui/app.js";

const NS = "wts";

/** Migra uma vez o save antigo do localStorage para o backend novo (IndexedDB). */
function migrateFromLocalStorage(backend) {
  try {
    if (typeof localStorage === "undefined") return;
    const fullKey = `${NS}:world`;
    if (backend.get(fullKey) != null) return; // já existe no destino
    const old = localStorage.getItem(fullKey);
    if (old != null) backend.set(fullKey, old);
  } catch {
    /* sem localStorage ou acesso negado: nada a migrar */
  }
}

async function makeStorage() {
  // 1) IndexedDB (preferencial): agrupa as gravações do burst (deferMs) e grava
  //    em segundo plano. Elimina o teto de ~5 MB e o custo de serializar por dia.
  if (IndexedDBBackend.isAvailable()) {
    try {
      const backend = new IndexedDBBackend({ dbName: NS, storeName: "kv" });
      await backend.init();
      migrateFromLocalStorage(backend);
      return new StorageService(backend, { namespace: NS, deferMs: 300 });
    } catch (err) {
      console.warn("IndexedDB indisponível; usando localStorage.", err?.name || err);
    }
  }
  // 2) localStorage (síncrono, imediato).
  try {
    if (typeof localStorage !== "undefined") {
      return new StorageService(new LocalStorageBackend(localStorage), { namespace: NS });
    }
  } catch {
    /* cai para memória */
  }
  // 3) Memória (sem persistência entre sessões).
  return new StorageService(new MemoryBackend(), { namespace: NS });
}

async function main() {
  const storage = await makeStorage();
  const game = new GameController({ storage });
  const root = document.getElementById("app");
  const app = new App(root, game);
  app.start();

  // exposto para depuração no console do navegador
  window.__wt = { game, app, storage };

  // Garante que o último estado (modo adiado) seja persistido ao sair/ocultar.
  const flush = () => { try { storage.flush?.(); } catch { /* melhor esforço */ } };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

main();
