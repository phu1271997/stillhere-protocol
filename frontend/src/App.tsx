import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Database,
  HelpCircle,
  HeartHandshake,
  FolderOpen,
  ExternalLink,
  Github,
  BookOpen,
  FileText,
  Scale as ScaleIcon,
} from 'lucide-react';
import { ConnectWallet } from './components/ConnectWallet';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { CORE_ADDRESS, REGISTRY_ADDRESS, explorerAddressUrl } from './lib/client';

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
              <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-white tracking-tight">
                <img src="/logo.svg" alt="StillHere logo" className="w-9 h-9 rounded-xl shadow-lg shadow-brand-600/25" />
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

        <footer className="border-t border-slate-800/60 bg-slate-950 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              {/* Col 1 — brand */}
              <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.svg" alt="StillHere" className="w-9 h-9 rounded-xl" />
                  <span className="font-bold text-lg text-white">Still<span className="text-brand-500">Here</span></span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Decentralized AI Jury on GenLayer for romance-scam prevention. Advisory verdicts, no single-entity
                  liability, privacy by construction.
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-[10px] uppercase font-semibold tracking-wider self-start">
                  Studionet · Preview
                </div>
              </div>

              {/* Col 2 — Protocol */}
              <FooterCol title="Protocol">
                <FooterLink to="/request" label="Request verify" />
                <FooterLink to="/cases" label="My cases" />
                <FooterLink to="/registry" label="Profile registry" />
                <FooterLink to="/how-it-works" label="How it works" />
              </FooterCol>

              {/* Col 3 — Learn */}
              <FooterCol title="Learn">
                <FooterAnchor href="https://github.com/phu1271997/stillhere-protocol#readme" label="README" icon={<BookOpen className="w-3 h-3" />} />
                <FooterAnchor href="https://github.com/phu1271997/stillhere-protocol/blob/main/ARCHITECTURE.md" label="Architecture" icon={<FileText className="w-3 h-3" />} />
                <FooterAnchor href="https://github.com/phu1271997/stillhere-protocol/blob/main/ECONOMICS.md" label="Economics" icon={<FileText className="w-3 h-3" />} />
                <FooterAnchor href="https://github.com/phu1271997/stillhere-protocol/blob/main/SECURITY.md" label="Security" icon={<ScaleIcon className="w-3 h-3" />} />
                <FooterAnchor href="https://github.com/phu1271997/stillhere-protocol/blob/main/docs/ETHICS.md" label="Ethics" icon={<FileText className="w-3 h-3" />} />
              </FooterCol>

              {/* Col 4 — On-chain + community */}
              <FooterCol title="On-chain">
                <FooterAnchor href={explorerAddressUrl(CORE_ADDRESS)} label="StillHereCore" icon={<ExternalLink className="w-3 h-3" />} />
                <FooterAnchor href={explorerAddressUrl(REGISTRY_ADDRESS)} label="ScammerRegistry" icon={<ExternalLink className="w-3 h-3" />} />
                <FooterAnchor href="https://studio.genlayer.com" label="GenLayer Studio" icon={<ExternalLink className="w-3 h-3" />} />
                <FooterAnchor href="https://github.com/phu1271997/stillhere-protocol" label="GitHub" icon={<Github className="w-3 h-3" />} />
                <FooterAnchor href="https://portal.genlayer.foundation" label="GenLayer Portal" icon={<ExternalLink className="w-3 h-3" />} />
              </FooterCol>
            </div>

            <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span>StillHere Protocol · Built for the GenLayer Builder Program</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">chain id 61999 · 0xF1EF</span>
                <span className="hidden sm:inline text-slate-700">·</span>
                <span>Advisory, not legal</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;

const FooterCol: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-2.5">
    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-300">{title}</h4>
    <ul className="flex flex-col gap-1.5">{children}</ul>
  </div>
);

const FooterLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <li>
    <Link to={to} className="text-xs text-slate-400 hover:text-brand-300 transition-colors">
      {label}
    </Link>
  </li>
);

const FooterAnchor: React.FC<{ href: string; label: string; icon?: React.ReactNode }> = ({ href, label, icon }) => (
  <li>
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-slate-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1.5"
    >
      {icon} {label}
    </a>
  </li>
);
