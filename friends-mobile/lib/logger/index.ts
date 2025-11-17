import { logger, consoleTransport } from 'react-native-logs';

// Configure the main logger
const config = {
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: __DEV__ ? 'debug' : 'info',
  transport: consoleTransport,
  transportOptions: {
    colors: {
      debug: 'grey',
      info: 'blueBright',
      warn: 'yellowBright',
      error: 'redBright',
    },
  },
  async: true,
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  enabled: true,
};

const log = logger.createLogger(config);

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

// Utility to log with context
export function logWithContext(
  namespace: ReturnType<typeof log.extend>,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, any>
) {
  if (context) {
    namespace[level](`${message}`, context);
  } else {
    namespace[level](message);
  }
}

// Performance logging helper
export function logPerformance(namespace: ReturnType<typeof log.extend>, operation: string) {
  const start = Date.now();
  return {
    end: (success = true, context?: Record<string, any>) => {
      const duration = Date.now() - start;
      if (success) {
        namespace.info(`${operation} completed`, { duration: `${duration}ms`, ...context });
      } else {
        namespace.warn(`${operation} failed`, { duration: `${duration}ms`, ...context });
      }
    },
  };
}
