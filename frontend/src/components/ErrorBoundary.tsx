import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof console !== 'undefined') {
      console.error('[StillHere ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || 'Unknown client-side error.';
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="glass-panel p-8 flex flex-col gap-5" role="alert" aria-live="assertive">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Something broke in the UI</h2>
          </div>
          <p className="text-sm text-slate-300">
            The app hit an unhandled error. Your on-chain data is safe — this only affects the
            current browser tab. You can retry the last action, or reload the page.
          </p>
          <pre className="text-xs font-mono text-rose-300 bg-slate-950/80 border border-rose-900/60 rounded-lg p-3 whitespace-pre-wrap break-words">
            {msg}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
