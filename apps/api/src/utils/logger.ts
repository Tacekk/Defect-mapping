import { config } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelColors: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const reset = '\x1b[0m';

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const color = levelColors[level];
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (config.isDev) {
      console.debug(formatMessage('debug', message, meta));
    }
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(formatMessage('info', message, meta));
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', message, meta));
  },

  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(formatMessage('error', message, meta));
  },
};
