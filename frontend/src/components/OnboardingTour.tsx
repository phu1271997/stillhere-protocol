import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'stillhere:onboarding:v1';

interface Step {
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to StillHere',
    body: (
      <>
        A decentralized AI Jury for romance-scam verification. This tour walks you through what happens when you
        submit a case — 4 quick steps, no wallet required to read.
      </>
    ),
  },
  {
    title: 'Your inputs are hashed before signing',
    body: (
      <>
        The chat sample and claimed identity are <code className="font-mono text-brand-300">keccak256</code>-hashed{' '}
        <strong>in your browser</strong> before the transaction is signed. Only the hash lands on-chain. Plaintext
        never leaves your machine except into the leader validator's LLM prompt in memory.
      </>
    ),
  },
  {
    title: 'Preview the exact jury prompt',
    body: (
      <>
        Below the form there is a <strong>Preview the exact prompt</strong> panel — click to expand and read every
        line the AI Jury will see, with a per-case canary token that catches prompt-injection attempts.
      </>
    ),
  },
  {
    title: 'What happens after you sign',
    body: (
      <>
        The <code className="font-mono text-brand-300">request_verification</code> transaction runs the AI Jury inside
        the same tx (leader fetches the URL, prompts an LLM, validators re-execute and vote on the verdict). Wall
        clock: 30–120 s. The Pending page auto-polls and hands off to the Verdict page as soon as the tx finalizes.
      </>
    ),
  },
];

export const OnboardingTour: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage may be disabled — show the tour once
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // non-fatal
    }
    setOpen(false);
  };

  const next = () => (idx < STEPS.length - 1 ? setIdx(idx + 1) : dismiss());
  const prev = () => idx > 0 && setIdx(idx - 1);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setIdx(0);
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-brand-300 hover:border-brand-500/40 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label="Replay onboarding tour"
      >
        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
        Replay tour
      </button>
    );
  }

  const step = STEPS[idx];

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="glass-panel max-w-md w-full p-6 flex flex-col gap-4 relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close onboarding tour"
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
          <h3 id="onboarding-title" className="text-lg font-bold text-white">
            {step.title}
          </h3>
        </div>

        <div className="text-sm text-slate-300 leading-relaxed">{step.body}</div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
          <div className="flex items-center gap-1.5" aria-label="Tour progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={idx === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <ChevronLeft className="w-3 h-3" /> Back
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              {idx < STEPS.length - 1 ? (
                <>Next <ChevronRight className="w-3 h-3" /></>
              ) : (
                'Done'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
