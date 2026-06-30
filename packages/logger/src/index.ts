export interface LoggerOptions {
  debug?: boolean;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string, data?: unknown): void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const debugEnabled = Boolean(options.debug);

  return {
    info(message: string): void {
      console.log(`[aabx] ${message}`);
    },
    warn(message: string): void {
      console.warn(`[aabx] ${message}`);
    },
    error(message: string): void {
      console.error(`[aabx] ${message}`);
    },
    debug(message: string, data?: unknown): void {
      if (!debugEnabled) {
        return;
      }
      if (typeof data === "undefined") {
        console.debug(`[aabx:debug] ${message}`);
        return;
      }
      console.debug(`[aabx:debug] ${message}`, data);
    },
  };
}
