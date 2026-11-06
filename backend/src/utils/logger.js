// backend/src/utils/logger.js
/**
 * Simple Logger Utility
 * Wird für Debugging und Logging verwendet
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[36m'
}

const getColor = (level) => {
  switch (level) {
    case LOG_LEVELS.ERROR:
      return colors.red
    case LOG_LEVELS.WARN:
      return colors.yellow
    case LOG_LEVELS.INFO:
      return colors.green
    case LOG_LEVELS.DEBUG:
      return colors.blue
    default:
      return colors.reset
  }
}

export const logger = {
  error: (message, data) => {
    console.error(`${colors.red}[ERROR]${colors.reset}`, message, data || '')
  },
  warn: (message, data) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset}`, message, data || '')
  },
  info: (message, data) => {
    console.log(`${colors.green}[INFO]${colors.reset}`, message, data || '')
  },
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`${colors.blue}[DEBUG]${colors.reset}`, message, data || '')
    }
  }
}
