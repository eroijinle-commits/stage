/**
 * React Error Boundary — catches render-time errors in the component tree,
 * reports them to the backend, and shows a fallback UI.
 * @module components/ErrorBoundary
 */

import { Component, type ReactNode } from "react";
import { reportError } from "@/lib/error-report";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Defaults to a simple error message. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportError(error, "errorBoundary", "error", {
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-destructive text-lg font-mono mb-2">Something went wrong</div>
          <div className="text-muted-foreground text-sm font-mono mb-4">
            {this.state.error?.message ?? "Unknown error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-mono hover:opacity-80 transition-opacity"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
