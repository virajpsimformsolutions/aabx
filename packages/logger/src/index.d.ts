export interface LoggerOptions {
    debug?: boolean;
}
export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string, data?: unknown): void;
}
export declare function createLogger(options?: LoggerOptions): Logger;
//# sourceMappingURL=index.d.ts.map