import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        readable = `${parsed.error} (${parsed.operationType || 'operation'} on ${parsed.path || 'unknown'})`;
      }
    } catch {
      // Keep raw error message
    }
    return { hasError: true, message: readable };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <p className="text-xs font-medium text-red-700 uppercase tracking-wider">Application Error</p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">Something interrupted this session</h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Reload RepairLoop
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
