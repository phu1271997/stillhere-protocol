import React from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { STUDIONET_EXPLORER } from '../lib/client';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Explanation {
  headline: string;
  body: string;
  hint?: string;
  href?: { url: string; label: string };
}

// Deterministic catalog — matches the concrete error messages the app can
// legitimately produce. Keeps the fallback UI useful instead of a bare
// stack trace.
function classify(err: Error | null): Explanation {
  const raw = (err?.message || '').toLowerCase();

  if (raw.includes('metamask') || raw.includes('window.ethereum')) {
    return {
      headline: 'MetaMask not detected',
      body: 'This app signs every transaction through MetaMask — no private key ever touches the frontend bundle. Install the MetaMask browser extension, then reload.',
      href: { url: 'https://metamask.io/download', label: 'Install MetaMask' },
    };
  }
  if (raw.includes("'from'") || raw.includes('wrong chain') || raw.includes('chain id')) {
    return {
      headline: 'Wallet is on the wrong network',
      body: 'MetaMask is signed in on a network that is not GenLayer Studio Network (chain id 61999 / 0xF1EF). Click Connect in the header — the app runs wallet_switchEthereumChain automatically.',
    };
  }
  if (raw.includes('insufficient funds')) {
    return {
      headline: 'Wallet is out of GEN on studionet',
      body: 'Fund your MetaMask address from the Studio Accounts panel by transferring GEN from a pre-funded account. The public testnet faucet does NOT fund studionet.',
      href: { url: 'https://studio.genlayer.com', label: 'Open Studio Accounts panel' },
    };
  }
  if (raw.includes('execution failed') || raw.includes('exit_code') || raw.includes('view')) {
    return {
      headline: 'Studionet view execution is offline',
      body: "The studionet eth_call route is currently returning exit_code 1 for these contracts — a Studio-runtime issue, not a contract bug. The tx and verdict are on-chain; read them from GenLayer Explorer.",
      href: { url: STUDIONET_EXPLORER, label: 'Open Explorer' },
    };
  }
  if (raw.includes('finalize') || raw.includes('timeout')) {
    return {
      headline: 'Transaction did not finalize in time',
      body: 'Consensus can take up to 4 minutes on studionet when validators are slow. Refresh the pending page — the tx often finalizes shortly after this message shows.',
    };
  }
  if (raw.includes('json') || raw.includes('parse')) {
    return {
      headline: 'Payload decode failed',
      body: "The response from the studionet RPC could not be parsed. This usually clears on retry.",
    };
  }
  return {
    headline: 'Something broke in the UI',
    body: 'The app hit an unhandled error. Your on-chain data is safe — this only affects the current browser tab.',
  };
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

    const ex = classify(this.state.error);
    const rawMsg = this.state.error?.message || 'Unknown client-side error.';

    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="glass-panel p-8 flex flex-col gap-5" role="alert" aria-live="assertive">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{ex.headline}</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{ex.body}</p>

          {ex.href && (
            <a
              href={ex.href.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 self-start"
            >
              {ex.href.label} <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <details className="rounded-lg border border-slate-800">
            <summary className="cursor-pointer text-xs text-slate-400 px-3 py-2">
              Raw error (for bug reports)
            </summary>
            <pre className="text-xs font-mono text-rose-300 bg-slate-950/80 border-t border-rose-900/60 rounded-b-lg p-3 whitespace-pre-wrap break-words">
              {rawMsg}
            </pre>
          </details>

          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
