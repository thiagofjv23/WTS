/**
 * Bootstrap da aplicação (navegador).
 * Monta o GameController (persistência em localStorage) e inicia a interface.
 */

import { StorageService, LocalStorageBackend, MemoryBackend } from "./services/storage.js";
import { GameController } from "./app/gameController.js";
import { App } from "./ui/app.js";

function makeStorage() {
  try {
    if (typeof localStorage !== "undefined") {
      return new StorageService(new LocalStorageBackend(localStorage));
    }
  } catch {
    /* ambientes sem localStorage caem no backend de memória */
  }
  return new StorageService(new MemoryBackend());
}

const game = new GameController({ storage: makeStorage() });
const root = document.getElementById("app");
const app = new App(root, game);
app.start();

// exposto para depuração no console do navegador
window.__wt = { game, app };
