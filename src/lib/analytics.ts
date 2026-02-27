// Simple analytics tracking without complex privacy features
export interface AnalyticsEvent {
  action: string;
  context?: Record<string, any>;
  timestamp: string;
}

class SimpleAnalytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 500;

  track(action: string, context?: Record<string, any>) {
    const event: AnalyticsEvent = {
      action,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${action}`, context);
    }
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;

    // Remove common sensitive fields
    const sanitized = { ...context };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Specific tracking methods
  trackPageView(page: string) {
    this.track('page_view', { page });
  }

  trackUserAction(action: string, context?: Record<string, any>) {
    this.track(action, context);
  }

  trackError(error: string, context?: Record<string, any>) {
    this.track('error', { error, ...context });
  }

  trackRsvp(action: 'attempt' | 'success' | 'error' | 'cancel', eventId: string) {
    this.trackUserAction(`rsvp_${action}`, { eventId });
  }

  // Get events for debugging
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  // Clear all data
  clearData() {
    this.events = [];
  }
}

export const analytics = new SimpleAnalytics();
