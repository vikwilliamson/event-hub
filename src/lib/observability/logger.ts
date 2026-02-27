// Simple structured logger without external dependencies
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private currentLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      sessionId: this.getSessionId(),
    };
  }

  private getSessionId(): string {
    // Simple session ID stored in sessionStorage
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    }
    return 'server';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const levelName = LogLevel[entry.level];
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const consoleMethod = levelName.toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
      console[consoleMethod](`[${entry.timestamp}] ${levelName}: ${entry.message}${contextStr}`);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.addLog(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.addLog(this.createLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.addLog(this.createLogEntry(LogLevel.WARN, message, context));
  }

  error(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.addLog(this.createLogEntry(LogLevel.ERROR, message, context));
  }

  // Component-specific logging
  component(componentName: string, message: string, context?: Record<string, any>) {
    this.info(message, { ...context, component: componentName });
  }

  action(actionName: string, context?: Record<string, any>) {
    this.info(`Action: ${actionName}`, { ...context, action: actionName });
  }

  // RSVP-specific logging
  rsvp(action: 'attempt' | 'success' | 'error' | 'cancel', eventId: string, context?: Record<string, any>) {
    this.action(`rsvp_${action}`, { eventId, ...context });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: Record<string, any>) {
    this.info(`Performance: ${operation} took ${duration}ms`, { 
      operation, 
      duration, 
      ...context 
    });
  }

  // Get logs for debugging/export
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Clear logs (for privacy)
  clearLogs() {
    this.logs = [];
  }

  // Export logs as JSON (for user to download)
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = Logger.getInstance();
