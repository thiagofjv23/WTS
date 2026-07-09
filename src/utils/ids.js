/**
 * ID Generator
 *
 * IDs são únicos e permanentes; nunca reutilizados (SimulationRules §9).
 * Contadores por prefixo, com estado serializável para que os saves preservem
 * a unicidade entre sessões.
 */

export class IdGenerator {
  constructor(state = {}) {
    /** @type {Object<string, number>} próximo número por prefixo. */
    this._counters = { ...state };
  }

  /** Gera o próximo ID para um prefixo (ex.: next("ATH") => "ATH-1"). */
  next(prefix) {
    const current = this._counters[prefix] || 0;
    const value = current + 1;
    this._counters[prefix] = value;
    return `${prefix}-${value}`;
  }

  /** Estado serializável (para salvar). */
  getState() {
    return { ...this._counters };
  }

  /** Restaura estado previamente salvo. */
  setState(state) {
    this._counters = { ...state };
  }
}
