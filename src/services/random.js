/**
 * Random System
 *
 * Única fonte de aleatoriedade do simulador (ver random_system.md).
 * Nenhum outro módulo deve chamar Math.random() diretamente.
 *
 * Baseado no algoritmo Mulberry32: gerador determinístico de 32 bits,
 * rápido, sem dependências e com estado serializável em um único inteiro,
 * permitindo salvar/retomar a sequência exatamente onde parou.
 */

const UINT32 = 0x100000000; // 2^32

/** Normaliza qualquer entrada para uma seed inteira de 32 bits sem sinal. */
function normalizeSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  // Hash simples (FNV-1a) para aceitar seeds em string.
  const str = String(seed ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class RandomSystem {
  /**
   * @param {number|string} seed  Semente inicial da simulação.
   */
  constructor(seed) {
    this._seed = normalizeSeed(seed);
    this._state = this._seed;
  }

  /** Seed original (imutável) usada para criar este gerador. */
  get seed() {
    return this._seed;
  }

  /** Retorna o estado interno atual (serializável para salvamento). */
  getState() {
    return this._state >>> 0;
  }

  /** Restaura um estado previamente salvo, retomando a sequência. */
  setState(state) {
    this._state = normalizeSeed(state);
  }

  /**
   * Número uniforme em [0, 1). Núcleo do gerador (Mulberry32).
   * Todos os demais métodos derivam deste.
   */
  next() {
    this._state = (this._state + 0x6d2b79f5) >>> 0;
    let t = this._state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  }

  /** Inteiro uniforme em [min, max] (ambos inclusivos). */
  int(min, max) {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float uniforme em [min, max). */
  float(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Retorna true com probabilidade p (0..1).
   * Ex.: chance(0.7) => ~70% de true.
   */
  chance(p) {
    return this.next() < p;
  }

  /** Escolhe um elemento de um array com probabilidade uniforme. */
  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.int(0, array.length - 1)];
  }

  /**
   * Escolha ponderada. Aceita:
   *  - weighted(items, weights)  com dois arrays paralelos, ou
   *  - weighted([{ value, weight }, ...])
   * Retorna o value escolhido proporcionalmente ao peso.
   */
  weighted(items, weights) {
    let values, w;
    if (weights === undefined) {
      values = items.map((e) => e.value);
      w = items.map((e) => e.weight);
    } else {
      values = items;
      w = weights;
    }
    const total = w.reduce((a, b) => a + b, 0);
    if (total <= 0) return this.pick(values);
    let roll = this.next() * total;
    for (let i = 0; i < values.length; i++) {
      roll -= w[i];
      if (roll < 0) return values[i];
    }
    return values[values.length - 1];
  }

  /**
   * Amostra de uma distribuição normal (Box-Muller), útil para geração de
   * talentos e pequenas variações (Gaussian Variation em random_system.md).
   * @param {number} mean  média
   * @param {number} std   desvio padrão
   */
  gaussian(mean = 0, std = 1) {
    // Box-Muller; evita u1 = 0 para não estourar o log.
    let u1 = this.next();
    const u2 = this.next();
    if (u1 < 1e-12) u1 = 1e-12;
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    return mean + std * mag * Math.cos(2 * Math.PI * u2);
  }

  /** Embaralha um array in-place (Fisher-Yates) de forma determinística. */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Deriva um novo RandomSystem independente a partir deste, útil para dar a
   * cada subsistema (ex.: cada competição) sua própria corrente reprodutível
   * sem consumir a corrente principal.
   */
  derive(label) {
    const mix = normalizeSeed(`${this._seed}:${label}:${this._state}`);
    return new RandomSystem(mix);
  }
}

/** Fábrica de conveniência. */
export function createRandom(seed) {
  return new RandomSystem(seed);
}
