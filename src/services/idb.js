/**
 * Backend de persistência em IndexedDB.
 *
 * O IndexedDB é ASSÍNCRONO, mas todo o motor é SÍNCRONO (o Save System grava no
 * meio do pipeline diário). Para não reescrever o motor, este backend mantém a
 * MESMA interface síncrona dos demais (`get/set/remove/keys`) sobre um cache em
 * memória, hidratado do IndexedDB em `init()` (chamado uma vez no boot, com
 * await). As gravações vão para o IndexedDB em SEGUNDO PLANO (não bloqueiam a
 * simulação); se falharem, a simulação segue em memória. Ver DECISIONS.md.
 *
 * Vantagem sobre o localStorage: a cota é uma fração do disco (centenas de MB a
 * GBs), então o teto de ~5 MB deixa de ser o gargalo.
 */

export class IndexedDBBackend {
  constructor({ dbName = "wts", storeName = "kv" } = {}) {
    this._dbName = dbName;
    this._storeName = storeName;
    this._db = null;
    this._map = new Map(); // cache síncrono (fonte das leituras)
    this._warned = false;
  }

  /** True se o ambiente oferece IndexedDB (navegador). */
  static isAvailable() {
    return typeof indexedDB !== "undefined";
  }

  /** Abre o banco e hidrata o cache em memória. Deve ser chamado antes do uso. */
  async init() {
    this._db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this._dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this._storeName)) db.createObjectStore(this._storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = this._db.transaction(this._storeName, "readonly");
      const req = tx.objectStore(this._storeName).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          this._map.set(cur.key, cur.value);
          cur.continue();
        } else resolve();
      };
      req.onerror = () => reject(req.error);
    });
    return this;
  }

  get(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  }

  set(key, value) {
    this._map.set(key, value);
    this._write((store) => store.put(value, key));
  }

  remove(key) {
    this._map.delete(key);
    this._write((store) => store.delete(key));
  }

  keys() {
    return [...this._map.keys()];
  }

  /** Gravação assíncrona em segundo plano; erros não interrompem a simulação. */
  _write(op) {
    if (!this._db) return;
    try {
      const tx = this._db.transaction(this._storeName, "readwrite");
      op(tx.objectStore(this._storeName));
      tx.onerror = () => this._warn(tx.error);
    } catch (err) {
      this._warn(err);
    }
  }

  _warn(err) {
    if (this._warned) return;
    this._warned = true;
    console.warn(`IndexedDBBackend: falha ao gravar (${err?.name || "erro"}). A simulação continua em memória; o progresso pode não persistir.`);
  }
}
