type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

class Logger {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.context = context;
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...context });
  }

  debug(msg: string, data?: Record<string, unknown>) {
    this.log("debug", msg, data);
  }

  info(msg: string, data?: Record<string, unknown>) {
    this.log("info", msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>) {
    this.log("warn", msg, data);
  }

  error(msg: string, data?: Record<string, unknown>) {
    this.log("error", msg, data);
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
    if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

    const entry: LogEntry = {
      level,
      msg,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
}

export const logger = new Logger();

/**
 * Returns a child logger with the given requestId bound to every log entry.
 * Usage: const log = getRequestLogger(requestId); log.info('msg', { key: val })
 */
export function getRequestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}
