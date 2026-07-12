/**
 * Storage Service
 *
 * Camada de persistência abstrata (ver DocumentodeArquiteturadeSoftware.md).
 * O motor nunca fala com localStorage/IndexedDB diretamente: injeta-se um
 * backend com a interface { get, set, remove, keys }. Ver DECISIONS.md.
 *
 * Backends previstos:
 *   - MemoryBackend    : núcleo e testes em Node (padrão).
 *   - localStorage     : navegador (injetado na inicialização da UI).
 *   - IndexedDB        : futuro, sem alterar o motor.
 */

/** Backend em memória. Serve para testes e execução no console. */
export class MemoryBackend {
  constructor() {
    this._map = new Map();
  }
  get(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  }
  set(key, value) {
    this._map.set(key, value);
  }
  remove(key) {
    this._map.delete(key);
  }
  keys() {
    return [...this._map.keys()];
  }
}

/** Adaptador para o localStorage do navegador. */
export class LocalStorageBackend {
  constructor(storage) {
    this._ls = storage; // window.localStorage
  }
  get(key) {
    return this._ls.getItem(key);
  }
  set(key, value) {
    this._ls.setItem(key, value);
  }
  remove(key) {
    this._ls.removeItem(key);
  }
  keys() {
    const out = [];
    for (let i = 0; i < this._ls.length; i++) out.push(this._ls.key(i));
    return out;
  }
}

export class StorageService {
  /**
   * @param {object} backend  Um dos backends acima (ou compatível).
   * @param {string|object} [options]  Prefixo (compat.) ou `{ namespace, deferMs }`.
   *   - `deferMs > 0` ativa o modo ADIADO: gravações sucessivas (ex.: o save de
   *     cada dia num "próximo evento") são AGRUPADAS e serializadas UMA vez, ao
   *     fim do burst. Elimina o custo de `JSON.stringify` por dia com o mundo
   *     grande. Use com backend assíncrono (IndexedDB). Chame `flush()` ao sair.
   */
  constructor(backend, options = {}) {
    if (typeof options === "string") options = { namespace: options };
    this._backend = backend;
    this._ns = options.namespace ?? "wts";
    this._deferMs = options.deferMs ?? 0;
    this._pending = new Map(); // chave completa → valor vivo (ainda não serializado)
    this._timer = null;
  }

  _key(key) {
    return `${this._ns}:${key}`;
  }

  /**
   * Grava um valor (serializando para JSON no modo imediato). NÃO propaga erro
   * do backend (ex.: QuotaExceededError): a simulação em memória segue viva
   * mesmo se a persistência falhar. Retorna `true` se aceito, `false` se o
   * backend recusou (modo imediato).
   * No modo adiado, apenas enfileira o valor (serialização acontece no `flush`).
   */
  save(key, value) {
    const fk = this._key(key);
    if (this._deferMs > 0) {
      this._pending.set(fk, value);
      if (!this._timer) {
        this._timer = setTimeout(() => this.flush(), this._deferMs);
        if (this._timer.unref) this._timer.unref(); // não segura o processo (Node/testes)
      }
      return true;
    }
    return this._writeNow(fk, value);
  }

  /** Persiste imediatamente tudo que estiver pendente (modo adiado). */
  flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    for (const [fk, value] of this._pending) this._writeNow(fk, value);
    this._pending.clear();
  }

  _writeNow(fullKey, value) {
    try {
      this._backend.set(fullKey, JSON.stringify(value));
      return true;
    } catch (err) {
      if (!this._warnedSave) {
        this._warnedSave = true;
        console.warn(`StorageService: falha ao salvar "${fullKey}" (${err?.name || "erro"}). A simulação continua em memória; o progresso pode não persistir.`);
      }
      return false;
    }
  }

  /** Lê e desserializa um valor. Retorna fallback se ausente/corrompido. */
  load(key, fallback = null) {
    const fk = this._key(key);
    // Valor recém-gravado ainda não serializado: devolve uma cópia coerente.
    if (this._pending.has(fk)) return JSON.parse(JSON.stringify(this._pending.get(fk)));
    const raw = this._backend.get(fk);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /** Remove uma chave. */
  remove(key) {
    const fk = this._key(key);
    this._pending.delete(fk);
    this._backend.remove(fk);
  }

  /** True se a chave existe (pendente ou já persistida). */
  has(key) {
    const fk = this._key(key);
    return this._pending.has(fk) || this._backend.get(fk) != null;
  }
}
