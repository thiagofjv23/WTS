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
   * @param {string} [namespace]  Prefixo aplicado a todas as chaves.
   */
  constructor(backend, namespace = "wts") {
    this._backend = backend;
    this._ns = namespace;
  }

  _key(key) {
    return `${this._ns}:${key}`;
  }

  /** Grava um valor serializando para JSON. */
  save(key, value) {
    this._backend.set(this._key(key), JSON.stringify(value));
  }

  /** Lê e desserializa um valor. Retorna fallback se ausente/corrompido. */
  load(key, fallback = null) {
    const raw = this._backend.get(this._key(key));
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /** Remove uma chave. */
  remove(key) {
    this._backend.remove(this._key(key));
  }

  /** True se a chave existe. */
  has(key) {
    return this._backend.get(this._key(key)) != null;
  }
}
