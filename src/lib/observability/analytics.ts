export interface AnalyticsEvent {
  action: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  pageViews: number;
  userActions: number;
  errors: number;
  avgPerformance: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  popularPages: Array<{ page: string; count: number }>;
  commonActions: Array<{ action: string; count: number }>;
  retention: { eventsKept: number; maxEvents: number; retentionDays: number };
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private enabled = true;
  private readonly maxEvents = 500;
  private readonly retentionDays = 30;

  track(action: string, context?: Record<string, unknown>) {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      action,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${action}`, context);
    }
  }

  private sanitizeContext(
    context?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!context) return undefined;
    const sanitized = { ...context };
    for (const field of ["password", "token", "secret", "key", "auth"]) {
      if (field in sanitized) sanitized[field] = "[REDACTED]";
    }
    return sanitized;
  }

  trackPageView(page: string) {
    this.track("page_view", { page });
  }

  trackUserAction(action: string, context?: Record<string, unknown>) {
    this.track(action, context);
  }

  trackError(error: string, context?: Record<string, unknown>) {
    this.track("error", { error, ...context });
  }

  trackRsvp(
    action: "attempt" | "success" | "error" | "cancel",
    eventId: string
  ) {
    this.trackUserAction(`rsvp_${action}`, { eventId });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  getAnalytics(): AnalyticsData {
    const pageViewEvents = this.events.filter((e) => e.action === "page_view");
    const errorEvents = this.events.filter((e) => e.action === "error");
    const userActionEvents = this.events.filter(
      (e) => e.action !== "page_view" && e.action !== "error"
    );

    const pageCounts = new Map<string, number>();
    for (const e of pageViewEvents) {
      const page = (e.context?.page as string) ?? "unknown";
      pageCounts.set(page, (pageCounts.get(page) ?? 0) + 1);
    }

    const actionCounts = new Map<string, number>();
    for (const e of userActionEvents) {
      actionCounts.set(e.action, (actionCounts.get(e.action) ?? 0) + 1);
    }

    return {
      summary: {
        totalEvents: this.events.length,
        pageViews: pageViewEvents.length,
        userActions: userActionEvents.length,
        errors: errorEvents.length,
        avgPerformance: 0,
      },
      popularPages: Array.from(pageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count })),
      commonActions: Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count })),
      retention: {
        eventsKept: this.events.length,
        maxEvents: this.maxEvents,
        retentionDays: this.retentionDays,
      },
    };
  }

  exportData(): string {
    return JSON.stringify(this.events, null, 2);
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearData() {
    this.events = [];
  }
}

export const analytics = new Analytics();
