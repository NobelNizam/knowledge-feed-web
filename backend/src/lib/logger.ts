type Level = 'info' | 'warn' | 'error';

const ts = () => new Date().toISOString();

function emit(level: Level, args: unknown[]): void {
  // eslint-disable-next-line no-console
  console[level](`[${ts()}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
};
