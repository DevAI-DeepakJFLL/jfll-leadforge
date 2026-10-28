/**
 * Production-ready structured logging utility designed for AWS CloudFront / CloudWatch environments.
 * Emits ISO8601 timestamped structured logs with contextual metadata and ring-buffer diagnostics.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  sessionId: string;
  url: string;
}

const MAX_LOG_BUFFER = 50;
const logBuffer: LogEntry[] = [];

// Stable session ID for correlation across requests
let currentSessionId = '';
try {
  currentSessionId =
    sessionStorage.getItem('jfll_session_id') ||
    `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem('jfll_session_id', currentSessionId);
} catch {
  currentSessionId = `sess_${Date.now()}`;
}

function getLogColor(level: LogLevel): string {
  switch (level) {
    case 'DEBUG':
      return 'color: #94a3b8; font-weight: bold;';
    case 'INFO':
      return 'color: #0284c7; font-weight: bold;';
    case 'WARN':
      return 'color: #d97706; font-weight: bold;';
    case 'ERROR':
      return 'color: #dc2626; font-weight: bold;';
  }
}

function emit(level: LogLevel, category: string, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    context,
    sessionId: currentSessionId,
    url: typeof window !== 'undefined' && window.location ? window.location.href : '',
  };

  // Push to local diagnostic ring-buffer
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  // Attach to window for live in-browser debugging & AWS telemetry capture
  if (typeof window !== 'undefined') {
    (window as unknown as { __APP_LOGS__?: LogEntry[] }).__APP_LOGS__ = logBuffer;
  }

  const prefix = `[${entry.timestamp}] [${level}] [${category}]`;
  const style = getLogColor(level);

  switch (level) {
    case 'DEBUG':
      console.debug(`%c${prefix}`, style, message, context || '');
      break;
    case 'INFO':
      console.info(`%c${prefix}`, style, message, context || '');
      break;
    case 'WARN':
      console.warn(`%c${prefix}`, style, message, context || '');
      break;
    case 'ERROR':
      console.error(`%c${prefix}`, style, message, context || '');
      break;
  }
}

export const logger = {
  debug: (category: string, message: string, context?: Record<string, unknown>) =>
    emit('DEBUG', category, message, context),

  info: (category: string, message: string, context?: Record<string, unknown>) =>
    emit('INFO', category, message, context),

  warn: (category: string, message: string, context?: Record<string, unknown>) =>
    emit('WARN', category, message, context),

  error: (category: string, message: string, error?: unknown, context?: Record<string, unknown>) => {
    const errorMeta: Record<string, unknown> = { ...(context || {}) };
    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      errorMeta.stack = error.stack;
    } else if (error) {
      errorMeta.rawError = String(error);
    }
    emit('ERROR', category, message, errorMeta);
  },

  apiCall: (
    method: string,
    endpoint: string,
    durationMs: number,
    status: number,
    meta?: Record<string, unknown>
  ) => {
    const isError = status >= 400;
    const level: LogLevel = isError ? 'ERROR' : 'INFO';
    emit(level, 'API', `${method} ${endpoint} -> HTTP ${status} (${durationMs.toFixed(1)}ms)`, {
      method,
      endpoint,
      durationMs,
      status,
      ...meta,
    });
  },

  getRecentLogs: (): LogEntry[] => [...logBuffer],
};

/**
 * Initializes global error listeners for unhandled exceptions and promise rejections.
 */
export function initGlobalErrorLogging(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    logger.error('UNCAUGHT_EXCEPTION', event.message, event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('UNHANDLED_REJECTION', 'Unhandled Promise Rejection', event.reason);
  });

  logger.info('SYSTEM', 'CloudFront client logging initialized', {
    userAgent: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
  });
}
