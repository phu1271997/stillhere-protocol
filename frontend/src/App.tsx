import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ShieldCheck, Database, HelpCircle, HeartHandshake, FolderOpen } from 'lucide-react';
import { ConnectWallet } from './components/ConnectWallet';
import { DisclaimerBanner } from './components/DisclaimerBanner';

import { Home } from './pages/Home';
import { RequestVerify } from './pages/RequestVerify';
import { Pending } from './pages/Pending';
import { VerdictDetail } from './pages/VerdictDetail';
import { Dispute } from './pages/Dispute';
import { Registry } from './pages/Registry';
import { HowItWorks } from './pages/HowItWorks';
import { Cases } from './pages/Cases';
import { Contribute } from './pages/Contribute';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col justify-between">
        <div>
          <DisclaimerBanner />
          <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white tracking-tight">
                <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span>Still<span className="text-brand-500">Here</span></span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
                <Link to="/request" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4" /> Request Verify
                </Link>
                <Link to="/cases" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4" /> My Cases
                </Link>
                <Link to="/registry" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <Database className="w-4 h-4" /> Registry
                </Link>
                <Link to="/how-it-works" className="hover:text-brand-400 transition-colors flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" /> How It Works
                </Link>
              </nav>

              <ConnectWallet />
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/request" element={<RequestVerify />} />
              <Route path="/pending/:id" element={<Pending />} />
              <Route path="/verdict/:id" element={<VerdictDetail />} />
              <Route path="/dispute/:id" element={<Dispute />} />
              <Route path="/contribute/:id" element={<Contribute />} />
              <Route path="/registry" element={<Registry />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
            </Routes>
          </main>
        </div>

        <footer className="border-t border-slate-800/60 bg-slate-950 py-8 px-4 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            <span>StillHere Protocol — Deployed on GenLayer Studionet</span>
          </div>
          <p className="max-w-xl text-slate-400">
            Advisory protection protocol for romance scam detection. Built for GenLayer Builder Program Track.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
