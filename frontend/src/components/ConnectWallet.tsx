import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { connectWallet } from '../lib/wallet';

interface ConnectWalletProps {
  onAddressChange?: (address: `0x${string}` | null) => void;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ onAddressChange }) => {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      if (onAddressChange) onAddressChange(addr);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          const addr = accounts[0] as `0x${string}`;
          setAddress(addr);
          if (onAddressChange) onAddressChange(addr);
        }
      });

      const handleAccountsChanged = (accs: string[]) => {
        if (accs.length > 0) {
          const addr = accs[0] as `0x${string}`;
          setAddress(addr);
          if (onAddressChange) onAddressChange(addr);
        } else {
          setAddress(null);
          if (onAddressChange) onAddressChange(null);
        }
      };

      window.ethereum.on?.('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      };
    }
  }, [onAddressChange]);

  return (
    <div className="flex flex-col items-end">
      {address ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 font-mono text-sm shadow-inner">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">studionet</span>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-95 disabled:opacity-50"
        >
          <Wallet className="w-4 h-4" />
          <span>{loading ? 'Connecting...' : 'Connect MetaMask'}</span>
        </button>
      )}
      {error && (
        <span className="text-xs text-rose-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </span>
      )}
    </div>
  );
};
