/**
 * Logger
 *
 * Log leve e desligável. No núcleo/testes fica silencioso por padrão para não
 * poluir a saída; a UI/dev pode elevar o nível.
 */

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

export class Logger {
  constructor(level = "warn") {
    this._level = LEVELS[level] ?? LEVELS.warn;
  }
  setLevel(level) {
    this._level = LEVELS[level] ?? this._level;
  }
  error(...a) {
    if (this._level >= LEVELS.error) console.error("[ERROR]", ...a);
  }
  warn(...a) {
    if (this._level >= LEVELS.warn) console.warn("[WARN]", ...a);
  }
  info(...a) {
    if (this._level >= LEVELS.info) console.log("[INFO]", ...a);
  }
  debug(...a) {
    if (this._level >= LEVELS.debug) console.log("[DEBUG]", ...a);
  }
}

export const logger = new Logger("warn");
