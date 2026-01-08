/**
 * Structured Logger Utilities
 * Provides consistent, structured logging for agents
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  agentType?: string;
  sessionId?: string;
  roomName?: string;
  nodeId?: string;
  phase?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to output as JSON */
  jsonOutput: boolean;
  /** Additional context to include in all logs */
  defaultContext?: LogContext;
}

// ============================================================================
// Log Level Hierarchy
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
  includeTimestamp: true,
  jsonOutput: process.env.LOG_FORMAT === 'json',
};

// ============================================================================
// Logger Class
// ============================================================================

export class AgentLogger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(context: LogContext = {}, config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.context = { ...this.config.defaultContext, ...context };
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): AgentLogger {
    return new AgentLogger(
      { ...this.context, ...additionalContext },
      this.config
    );
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Format and output a log entry
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...meta },
    };

    if (this.config.jsonOutput) {
      console.log(JSON.stringify(entry));
    } else {
      this.prettyLog(entry);
    }
  }

  /**
   * Pretty print a log entry
   */
  private prettyLog(entry: LogEntry): void {
    const color = LOG_COLORS[entry.level];
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const prefix = this.context.agentType ? `[${this.context.agentType}]` : '';
    const nodeInfo = this.context.nodeId ? ` (${this.context.nodeId})` : '';
    
    let logLine = `${color}${levelStr}${RESET_COLOR}`;
    
    if (this.config.includeTimestamp) {
      const time = entry.timestamp.split('T')[1]?.split('.')[0] || '';
      logLine = `${time} ${logLine}`;
    }
    
    logLine += ` ${prefix}${nodeInfo} ${entry.message}`;
    
    // Add context if present
    const contextKeys = Object.keys(entry.context || {}).filter(
      k => !['agentType', 'nodeId', 'sessionId', 'roomName'].includes(k)
    );
    
    if (contextKeys.length > 0 && entry.context) {
      const contextStr = contextKeys
        .map(k => `${k}=${JSON.stringify(entry.context![k])}`)
        .join(' ');
      logLine += ` | ${contextStr}`;
    }

    // Add duration if present
    if (entry.duration !== undefined) {
      logLine += ` [${entry.duration}ms]`;
    }

    console.log(logLine);

    // Log error stack separately
    if (entry.error?.stack) {
      console.error(entry.error.stack);
    }
  }

  // Log level methods
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorInfo = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
      ? { name: 'Unknown', message: String(error) }
      : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: { ...this.context, ...meta },
      error: errorInfo,
    };

    if (this.config.jsonOutput) {
      console.error(JSON.stringify(entry));
    } else {
      this.prettyLog(entry);
    }
  }

  /**
   * Log with timing - useful for operations
   */
  async timed<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${operation}`, meta);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`Completed: ${operation}`, { ...meta, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${operation}`, error, { ...meta, duration });
      throw error;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a logger for an agent
 */
export function createAgentLogger(
  agentType: string,
  sessionId?: string
): AgentLogger {
  return new AgentLogger({ agentType, sessionId });
}

/**
 * Create a logger for a node
 */
export function createNodeLogger(
  agentType: string,
  nodeId: string,
  sessionId?: string
): AgentLogger {
  return new AgentLogger({ agentType, nodeId, sessionId });
}

// ============================================================================
// Global Logger Instance
// ============================================================================

let globalLogger: AgentLogger | null = null;

/**
 * Get or create the global logger
 */
export function getLogger(): AgentLogger {
  if (!globalLogger) {
    globalLogger = new AgentLogger();
  }
  return globalLogger;
}

/**
 * Set the global logger context
 */
export function setLoggerContext(context: LogContext): void {
  globalLogger = new AgentLogger(context);
}
