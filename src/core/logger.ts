const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'INFO';

const LEVELS: Record<string, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 1;

export const logger = {
    debug: (msg: string, ctx?: unknown) => currentLevel <= 0 && console.debug(`[DEBUG] ${msg}`, ctx ?? ''),
    info: (msg: string, ctx?: unknown) => currentLevel <= 1 && console.info(`[INFO] ${msg}`, ctx ?? ''),
    warn: (msg: string, ctx?: unknown) => currentLevel <= 2 && console.warn(`[WARN] ${msg}`, ctx ?? ''),
    error: (msg: string, ctx?: unknown) => console.error(`[ERROR] ${msg}`, ctx ?? ''),
};
