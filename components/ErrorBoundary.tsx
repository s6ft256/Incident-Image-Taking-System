/**
 * React Error Boundary Component
 * Catches uncaught errors in the component tree and displays a fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { handleError } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log through centralized error handler
    handleError(error, {
      componentStack: errorInfo.componentStack,
      type: 'react-error-boundary'
    }, { silent: true }); // Silent because we show custom UI
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
          <div className="max-w-md w-full">
            <div className="bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-10 text-center backdrop-blur-xl shadow-2xl">
              {/* Error Icon */}
              <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m15 9-6 6M9 9l6 6"/>
                </svg>
              </div>
              
              {/* Title */}
              <h1 className="text-2xl font-black text-white tracking-tight mb-3">
                System Fault Detected
              </h1>
              
              {/* Subtitle */}
              <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-6">
                Critical Error Handler Active
              </p>
              
              {/* Description */}
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                An unexpected error occurred. Your data has been preserved. 
                Please try again or reload the application.
              </p>
              
              {/* Error Details (Dev only) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-8 text-left">
                  <summary className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                    Technical Details
                  </summary>
                  <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 overflow-auto max-h-40">
                    <code className="text-[10px] text-rose-400 font-mono whitespace-pre-wrap break-all">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack && (
                        <span className="text-slate-600">{this.state.errorInfo.componentStack}</span>
                      )}
                    </code>
                  </div>
                </details>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all shadow-xl border border-blue-400/20 active:scale-[0.98]"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all border border-white/10 active:scale-[0.98]"
                >
                  Reload Application
                </button>
              </div>
              
              {/* Footer */}
              <p className="mt-8 text-[9px] text-slate-600 uppercase tracking-widest">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}
