// Simple logger implementation (fallback when react-native-logs has issues)
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  extend: (namespace: string) => Logger;
}

const createLogger = (namespace = 'app'): Logger => {
  const formatMessage = (level: LogLevel, msg: string, ctx?: Record<string, unknown>) => {
    const time = new Date().toLocaleTimeString();
    const contextStr = ctx ? ` ${JSON.stringify(ctx)}` : '';
    return `[${time}] [${level.toUpperCase()}] [${namespace}] ${msg}${contextStr}`;
  };

  return {
    debug: (msg, ctx) => __DEV__ && console.debug(formatMessage('debug', msg, ctx)),
    info: (msg, ctx) => console.info(formatMessage('info', msg, ctx)),
    warn: (msg, ctx) => console.warn(formatMessage('warn', msg, ctx)),
    error: (msg, ctx) => console.error(formatMessage('error', msg, ctx)),
    extend: (ns) => createLogger(`${namespace}:${ns}`),
  };
};

const log = createLogger();

// Create namespaced loggers for different parts of the app
export const appLogger = log.extend('app');
export const dbLogger = log.extend('db');
export const apiLogger = log.extend('api');
export const authLogger = log.extend('auth');
export const peopleLogger = log.extend('people');
export const relationsLogger = log.extend('relations');
export const storiesLogger = log.extend('stories');
export const eventsLogger = log.extend('events');
export const notificationsLogger = log.extend('notifications');
export const exportLogger = log.extend('export');
export const quizLogger = log.extend('quiz');
export const settingsLogger = log.extend('settings');
export const networkLogger = log.extend('network');
export const extractionLogger = log.extend('extraction');

// Default export for general use
export default log;

// Performance logging helper
export function logPerformance(namespace: Logger, operation: string) {
  const start = Date.now();
  return {
    end: (success = true, context?: Record<string, unknown>) => {
      const duration = Date.now() - start;
      if (success) {
        namespace.info(`${operation} completed`, { duration: `${duration}ms`, ...context });
      } else {
        namespace.warn(`${operation} failed`, { duration: `${duration}ms`, ...context });
      }
    },
  };
}
