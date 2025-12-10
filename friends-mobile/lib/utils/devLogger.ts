import { Paths, File as ExpoFile, Directory } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Development Logger - Saves logs to a file for later investigation
 * Logs are stored in the app's document directory and can be viewed/shared
 */

const LOG_FILE_NAME = 'dev-logs.txt';
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB max

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'PARTY' | 'AI' | 'DB';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category?: string;
  message: string;
  data?: any;
}

/**
 * Format a log entry as a readable string
 */
const formatLogEntry = (entry: LogEntry): string => {
  const emoji = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    PARTY: '🎉',
    AI: '🤖',
    DB: '💾',
  };

  const parts = [
    `[${entry.timestamp}]`,
    emoji[entry.level] || '',
    entry.level,
    entry.category ? `[${entry.category}]` : '',
    entry.message,
  ].filter(Boolean);

  let logLine = parts.join(' ');

  if (entry.data) {
    try {
      logLine += '\n  Data: ' + JSON.stringify(entry.data, null, 2);
    } catch (e) {
      logLine += '\n  Data: [Unable to stringify]';
    }
  }

  return logLine + '\n';
};

/**
 * Get or create the log file
 */
const getLogFile = (): ExpoFile => {
  const logDir = new Directory(Paths.document, 'logs');
  if (!logDir.exists) {
    logDir.create();
  }
  return new ExpoFile(logDir, LOG_FILE_NAME);
};

/**
 * Write a log entry to the file
 */
const writeToFile = async (entry: LogEntry): Promise<void> => {
  try {
    const logFile = getLogFile();
    const formattedEntry = formatLogEntry(entry);

    // Check if file size exceeds limit
    if (logFile.exists && logFile.size > MAX_LOG_SIZE) {
      // Rotate log file - keep last portion
      const currentContent = await logFile.text();
      const lines = currentContent.split('\n');
      const keepLines = lines.slice(-1000);
      await logFile.write(keepLines.join('\n') + '\n');
    }

    // Append to file (or create if doesn't exist)
    if (logFile.exists) {
      const existingContent = await logFile.text();
      await logFile.write(existingContent + formattedEntry);
    } else {
      await logFile.write(formattedEntry);
    }
  } catch (error) {
    // Fallback to console if file write fails
    console.error('DevLogger: Failed to write to file:', error);
  }
};

/**
 * Main logging function
 */
const log = async (
  level: LogLevel,
  message: string,
  data?: any,
  category?: string
): Promise<void> => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data,
  };

  // Always log to console as well
  const consoleMessage = formatLogEntry(entry);
  console.log(consoleMessage);

  // Write to file (non-blocking)
  writeToFile(entry).catch((err) => {
    console.error('DevLogger: Write failed:', err);
  });
};

/**
 * Exported logging functions
 */
export const devLogger = {
  debug: (message: string, data?: any, category?: string) => log('DEBUG', message, data, category),
  info: (message: string, data?: any, category?: string) => log('INFO', message, data, category),
  warn: (message: string, data?: any, category?: string) => log('WARN', message, data, category),
  error: (message: string, data?: any, category?: string) => log('ERROR', message, data, category),

  // Special category loggers
  party: (message: string, data?: any) => log('PARTY', message, data, 'Party'),
  ai: (message: string, data?: any) => log('AI', message, data, 'AI'),
  db: (message: string, data?: any) => log('DB', message, data, 'Database'),

  /**
   * Get the log file path for sharing/viewing
   */
  getLogFilePath: (): string => {
    const logFile = getLogFile();
    return logFile.uri;
  },

  /**
   * Read the entire log file
   */
  readLogs: async (): Promise<string> => {
    try {
      const logFile = getLogFile();

      if (!logFile.exists) {
        return 'No logs yet';
      }

      return await logFile.text();
    } catch (error) {
      return `Error reading logs: ${error}`;
    }
  },

  /**
   * Clear all logs
   */
  clearLogs: (): void => {
    try {
      const logFile = getLogFile();
      if (logFile.exists) {
        logFile.delete();
      }
      console.log('DevLogger: Logs cleared');
    } catch (error) {
      console.error('DevLogger: Failed to clear logs:', error);
    }
  },

  /**
   * Get log file info (size, path, etc.)
   */
  getLogInfo: () => {
    try {
      const logFile = getLogFile();

      return {
        path: logFile.uri,
        exists: logFile.exists,
        size: logFile.exists ? logFile.size : 0,
        sizeKB: logFile.exists ? (logFile.size / 1024).toFixed(2) : '0',
      };
    } catch (error) {
      return {
        path: '',
        exists: false,
        size: 0,
        sizeKB: '0',
        error: String(error),
      };
    }
  },

  /**
   * Get the log file for sharing
   */
  getLogFile: () => {
    try {
      const logFile = getLogFile();
      return logFile.exists ? logFile : null;
    } catch (error) {
      console.error('DevLogger: Failed to get log file:', error);
      return null;
    }
  },
};

// Export as default too
export default devLogger;
