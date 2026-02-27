import { logger } from './logger';

export interface AnalyticsEvent {
  type: 'page_view' | 'user_action' | 'performance' | 'error';
  action: string;
  context?: Record<string, any>;
  timestamp: string;
  sessionId: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  maxEvents: number;
  retentionDays: number;
}

class PrivacyAnalytics {
  private static instance: PrivacyAnalytics;
  private events: AnalyticsEvent[] = [];
  private config: AnalyticsConfig = {
    enabled: true,
    maxEvents: 1000,
    retentionDays: 30,
  };

  private constructor() {
    this.loadConfig();
    this.cleanupOldEvents();
  }

  static getInstance(): PrivacyAnalytics {
    if (!PrivacyAnalytics.instance) {
      PrivacyAnalytics.instance = new PrivacyAnalytics();
    }
    return PrivacyAnalytics.instance;
  }

  private loadConfig() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('analytics_config');
      if (stored) {
        try {
          this.config = { ...this.config, ...JSON.parse(stored) };
        } catch (e) {
          logger.warn('Failed to load analytics config', { error: e });
        }
      }
    }
  }

  private saveConfig() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics_config', JSON.stringify(this.config));
    }
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('analytics_session');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('analytics_session', sessionId);
      }
      return sessionId;
    }
    return 'server';
  }

  private cleanupOldEvents() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    this.events = this.events.filter(event => 
      new Date(event.timestamp) > cutoffDate
    );
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    this.saveConfig();
    logger.info(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  track(type: AnalyticsEvent['type'], action: string, context?: Record<string, any>) {
    if (!this.config.enabled) return;

    const event: AnalyticsEvent = {
      type,
      action,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };

    this.events.push(event);
    
    // Keep only the last maxEvents
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    logger.debug('Analytics event tracked', { type, action });
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;

    // Remove any potentially sensitive data
    const sanitized = { ...context };
    
    // Remove common sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Remove any field that looks like it might contain PII
    Object.keys(sanitized).forEach(key => {
      if (key.toLowerCase().includes('email') || 
          key.toLowerCase().includes('name') ||
          key.toLowerCase().includes('phone') ||
          key.toLowerCase().includes('address')) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Specific tracking methods
  trackPageView(page: string, title?: string) {
    this.track('page_view', 'page_view', { page, title });
  }

  trackUserAction(action: string, context?: Record<string, any>) {
    this.track('user_action', action, context);
  }

  trackPerformance(operation: string, duration: number, context?: Record<string, any>) {
    this.track('performance', 'performance', { operation, duration, ...context });
  }

  trackError(error: string, context?: Record<string, any>) {
    this.track('error', 'error', { error, ...context });
  }

  // RSVP-specific tracking
  trackRsvp(action: 'attempt' | 'success' | 'error' | 'cancel', eventId: string, context?: Record<string, any>) {
    this.trackUserAction(`rsvp_${action}`, { eventId, ...context });
  }

  // Get aggregated analytics (privacy-preserving)
  getAnalytics() {
    if (!this.config.enabled) return null;

    const pageViews = this.events.filter(e => e.type === 'page_view').length;
    const userActions = this.events.filter(e => e.type === 'user_action').length;
    const errors = this.events.filter(e => e.type === 'error').length;
    
    // Get most popular pages (without timestamps)
    const pageCounts: Record<string, number> = {};
    this.events
      .filter(e => e.type === 'page_view' && e.context?.page)
      .forEach(e => {
        const page = e.context!.page as string;
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      });

    // Get most common actions (without user context)
    const actionCounts: Record<string, number> = {};
    this.events
      .filter(e => e.type === 'user_action')
      .forEach(e => {
        actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
      });

    // Performance metrics (aggregated, no individual data)
    const performanceEvents = this.events.filter(e => e.type === 'performance');
    const avgPerformance = performanceEvents.length > 0
      ? performanceEvents.reduce((sum, e) => sum + (e.context?.duration || 0), 0) / performanceEvents.length
      : 0;

    return {
      summary: {
        totalEvents: this.events.length,
        pageViews,
        userActions,
        errors,
        avgPerformance: Math.round(avgPerformance),
      },
      popularPages: Object.entries(pageCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      commonActions: Object.entries(actionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => ({ action, count })),
      retention: {
        eventsKept: this.events.length,
        maxEvents: this.config.maxEvents,
        retentionDays: this.config.retentionDays,
      }
    };
  }

  // Export data (for user to download)
  exportData(): string {
    const analytics = this.getAnalytics();
    return JSON.stringify(analytics, null, 2);
  }

  // Clear all data
  clearData() {
    this.events = [];
    logger.info('Analytics data cleared');
  }

  // Get raw events (for debugging)
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }
}

export const analytics = PrivacyAnalytics.getInstance();
