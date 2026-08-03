/**
 * Simple logging utility for development and production.
 * In production, this would integrate with a logging service.
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private createLogEntry(level: LogEntry['level'], message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
  }

  info(message: string, context?: Record<string, unknown>) {
    const entry = this.createLogEntry('info', message, context);
    this.addLog(entry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    const entry = this.createLogEntry('warn', message, context);
    this.addLog(entry);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, context);
    }
  }

  error(message: string, context?: Record<string, unknown>) {
    const entry = this.createLogEntry('error', message, context);
    this.addLog(entry);
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, context);
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // For analytics dashboard
  getErrorCount(): number {
    return this.logs.filter(log => log.level === 'error').length;
  }

  getRecentErrors(count: number = 10): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-count);
  }
}

export const logger = new Logger();
