"use client";

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/observability/logger';
import { analytics } from '@/lib/observability/analytics';

export interface PerformanceMetrics {
  renderTime: number;
  componentLoadTime: number;
  interactionTime: number;
}

export function usePerformanceMonitoring(componentName: string) {
  const renderStartTime = useRef<number>();
  const componentLoadTime = useRef<number>();

  useEffect(() => {
    // Track component render performance
    renderStartTime.current = performance.now();
    
    // Track when component is fully loaded
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const renderEntry = entries.find(entry => entry.name === 'render');
      if (renderEntry) {
        const renderTime = renderEntry.duration;
        logger.performance(`${componentName} render`, renderTime);
        analytics.trackPerformance('component_render', renderTime, { component: componentName });
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    // Mark component as loaded
    setTimeout(() => {
      if (renderStartTime.current) {
        componentLoadTime.current = performance.now() - renderStartTime.current;
        logger.performance(`${componentName} load`, componentLoadTime.current);
        analytics.trackPerformance('component_load', componentLoadTime.current, { component: componentName });
      }
    }, 0);

    return () => {
      observer.disconnect();
    };
  }, [componentName]);

  const trackInteraction = (action: string, callback: () => void) => {
    return async (...args: any[]) => {
      const startTime = performance.now();
      
      try {
        const result = await callback(...args);
        const duration = performance.now() - startTime;
        
        logger.performance(`${componentName} ${action}`, duration);
        analytics.trackPerformance('user_interaction', duration, { 
          component: componentName, 
          action 
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        logger.error(`${componentName} ${action} failed`, {
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    };
  };

  return { trackInteraction };
}

// Hook for monitoring page performance
export function usePagePerformance(pageName: string) {
  useEffect(() => {
    // Track page view
    analytics.trackPageView(pageName);
    logger.component('Page', `Page view: ${pageName}`);

    // Track page load performance
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.loadEventStart;
      logger.performance(`Page load: ${pageName}`, loadTime);
      analytics.trackPerformance('page_load', loadTime, { page: pageName });
    }

    // Track Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        logger.performance(`LCP: ${pageName}`, lastEntry.startTime);
        analytics.trackPerformance('lcp', lastEntry.startTime, { page: pageName });
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP might not be supported in all browsers
      logger.debug('LCP observation not supported', { error: e });
    }

    return () => {
      lcpObserver.disconnect();
    };
  }, [pageName]);
}

// RSVP-specific performance monitoring
export function useRsvpPerformance() {
  const trackRsvpAction = (action: 'attempt' | 'success' | 'error' | 'cancel', eventId: string) => {
    return (callback: () => Promise<any>) => {
      return async (...args: any[]) => {
        const startTime = performance.now();
        
        try {
          analytics.trackRsvp(action, eventId, { startTime });
          const result = await callback(...args);
          
          const duration = performance.now() - startTime;
          logger.performance(`RSVP ${action}`, duration, { eventId });
          analytics.trackPerformance(`rsvp_${action}`, duration, { eventId });
          
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          
          logger.error(`RSVP ${action} failed`, {
            duration,
            eventId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          analytics.trackError(`RSVP ${action} failed`, { 
            duration, 
            eventId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          throw error;
        }
      };
    };
  };

  return { trackRsvpAction };
}
