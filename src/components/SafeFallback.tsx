// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SafeFallback extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SafeFallback caught an error', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
          <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">The application encountered an unexpected error on this view.</p>
            <button
              id="error-restart-btn"
              onClick={() => window.location.reload()}
              className="w-full bg-[#1a1d23] text-white rounded-xl py-3 text-sm font-bold hover:bg-[#2a2d35] transition-all"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children ?? null;
  }
}
