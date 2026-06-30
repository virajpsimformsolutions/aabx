export function createLogger(options = {}) {
    const debugEnabled = Boolean(options.debug);
    return {
        info(message) {
            console.log(`[aabx] ${message}`);
        },
        warn(message) {
            console.warn(`[aabx] ${message}`);
        },
        error(message) {
            console.error(`[aabx] ${message}`);
        },
        debug(message, data) {
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
//# sourceMappingURL=index.js.map