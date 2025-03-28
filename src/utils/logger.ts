/**
 * Logger utility for consistent logging that can be disabled in production
 */

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4 // Used to disable all logging
}

// Get current environment
const isProduction = process.env.NODE_ENV === 'production';

// Set default log level based on environment
let currentLogLevel = isProduction ? LogLevel.ERROR : LogLevel.DEBUG;

// Define logger object
export const logger = {
  // Method to set log level
  setLogLevel: (level: LogLevel) => {
    currentLogLevel = level;
  },

  // Log methods
  debug: (...args: any[]) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      if (isProduction) {
        // In production, we might want to use a service like Sentry or similar
        // For now, we'll just not log debug messages in production
      } else {
        console.debug('[DEBUG]', ...args);
      }
    }
  },

  info: (...args: any[]) => {
    if (currentLogLevel <= LogLevel.INFO) {
      if (isProduction) {
        // In production, maybe log to analytics or monitoring
      } else {
        console.info('[INFO]', ...args);
      }
    }
  },

  warn: (...args: any[]) => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: any[]) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
      
      // In a real app, you might want to send errors to a service like Sentry
      // if (typeof window !== 'undefined' && window.Sentry) {
      //   window.Sentry.captureException(args[0] || new Error('Unknown error'));
      // }
    }
  }
};

// Helper to automatically adjust log level based on environment variables
// This would be called during app startup
export const configureLogger = () => {
  // Check for environment variable overrides
  if (typeof process !== 'undefined' && process.env) {
    const envLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;
    
    if (envLogLevel) {
      switch (envLogLevel.toUpperCase()) {
        case 'DEBUG':
          logger.setLogLevel(LogLevel.DEBUG);
          break;
        case 'INFO':
          logger.setLogLevel(LogLevel.INFO);
          break;
        case 'WARN':
          logger.setLogLevel(LogLevel.WARN);
          break;
        case 'ERROR':
          logger.setLogLevel(LogLevel.ERROR);
          break;
        case 'NONE':
          logger.setLogLevel(LogLevel.NONE);
          break;
      }
    }
  }
};

// Configure logger on import
configureLogger();

export default logger; 