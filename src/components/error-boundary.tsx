"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/observability/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 m-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-neutral-900 text-center mb-2">
              Something went wrong
            </h2>
            
            <p className="text-neutral-600 text-center mb-6">
              We're sorry, but something unexpected happened. The error has been logged.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
              >
                Reload Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="w-full border border-neutral-300 bg-white text-neutral-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-neutral-100 rounded-md">
                <summary className="cursor text-sm font-medium text-neutral-900 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 text-xs text-neutral-600">
                  <p className="font-semibold">Error:</p>
                  <pre className="whitespace-pre-wrap break-all">
                    {this.state.error.message}
                  </pre>
                  
                  <p className="font-semibold mt-2">Stack:</p>
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {this.state.error.stack}
                  </pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <p className="font-semibold mt-2">Component Stack:</p>
                      <pre className="whitespace-pre-wrap break-all text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: Partial<ErrorInfo>) => {
    logger.error('Error caught by error handler', {
      error: error.message,
      stack: error.stack,
      ...errorInfo,
    });
  };
}
