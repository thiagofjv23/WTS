/**
 * World Event Bus
 *
 * Sistema nervoso do simulador (ver world_event_bus.md).
 * Sistemas não se chamam diretamente: publicam e escutam eventos.
 *
 * Implementação síncrona e determinística: um publish entrega o evento a cada
 * listener na ordem de inscrição, imediatamente. Isso preserva a
 * reprodutibilidade exigida pelo Random System (nenhuma fila assíncrona no
 * núcleo). Ver DECISIONS.md.
 */

let eventCounter = 0;

/** Gera um Event ID único e determinístico dentro de uma execução. */
function nextEventId() {
  eventCounter += 1;
  return `EVT-${eventCounter}`;
}

export class EventBus {
  constructor() {
    /** @type {Map<string, Array<{fn: Function, priority: number}>>} */
    this._listeners = new Map();
    /** Buffer opcional de histórico de eventos (para auditoria/testes). */
    this._log = [];
    this._logging = false;
  }

  /**
   * Inscreve um listener para um tipo de evento.
   * @param {string} type
   * @param {(event: object) => void} fn
   * @param {number} priority  Maior executa primeiro (padrão 0).
   * @returns {() => void} função para cancelar a inscrição.
   */
  on(type, fn, priority = 0) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    const entry = { fn, priority };
    const list = this._listeners.get(type);
    list.push(entry);
    // Mantém ordenado por prioridade desc, preservando ordem de inscrição
    // entre prioridades iguais (sort estável no V8).
    list.sort((a, b) => b.priority - a.priority);
    return () => {
      const i = list.indexOf(entry);
      if (i >= 0) list.splice(i, 1);
    };
  }

  /** Inscreve um listener que se remove após a primeira execução. */
  once(type, fn, priority = 0) {
    const off = this.on(
      type,
      (event) => {
        off();
        fn(event);
      },
      priority
    );
    return off;
  }

  /**
   * Publica um evento. Monta o envelope oficial e entrega aos interessados.
   * @param {string} type
   * @param {object} payload
   * @param {object} [meta]  { source, worldDate } opcionais.
   */
  publish(type, payload = {}, meta = {}) {
    const event = {
      eventId: nextEventId(),
      type,
      worldDate: meta.worldDate ?? null,
      timestamp: meta.timestamp ?? null,
      source: meta.source ?? null,
      payload,
    };
    if (this._logging) this._log.push(event);
    const list = this._listeners.get(type);
    if (list) {
      // Cópia defensiva: um listener pode inscrever/remover durante a entrega.
      for (const entry of [...list]) entry.fn(event);
    }
    return event;
  }

  /** Ativa/desativa o registro de eventos para auditoria. */
  enableLogging(enabled = true) {
    this._logging = enabled;
    if (!enabled) this._log = [];
  }

  /** Retorna cópia do log de eventos registrados. */
  getLog() {
    return [...this._log];
  }

  /** Remove todos os listeners (útil entre testes). */
  clear() {
    this._listeners.clear();
    this._log = [];
  }
}

/** Reseta o contador global de IDs (usado em testes determinísticos). */
export function resetEventIds() {
  eventCounter = 0;
}
