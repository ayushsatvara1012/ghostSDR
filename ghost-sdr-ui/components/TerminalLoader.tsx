'use client';

import { useState, useEffect } from 'react';

const KEYWORD_STEPS = [
  '> Initializing Ghost SDR Multi-Platform Hunt...',
  '> Google Dorking LinkedIn for matching profiles...',
  '> Scanning YouTube for buying-intent transcripts...',
  '> Mining Reddit threads for pain signals...',
  '> Checking podcasts and news for expansion signals...',
  '> Booting Claude Sonnet 4.6 AI Brain...',
  '> Scoring intent signals (0-100 per source)...',
  '> Synthesizing hyper-personalized openers...',
  '> Compiling prioritized lead profiles...',
];

const URL_STEPS = [
  '> Initializing Ghost SDR URL Enricher...',
  '> Resolving profile from LinkedIn URL...',
  '> Cross-referencing YouTube and news signals...',
  '> Booting Claude Sonnet 4.6 AI Brain...',
  '> Generating intent-matched opening line...',
];

const PLATFORM_STATUS = [
  { key: 'youtube',  label: 'YouTube'  },
  { key: 'reddit',   label: 'Reddit'   },
  { key: 'podcast',  label: 'Podcast'  },
  { key: 'news',     label: 'News'     },
];

export const TerminalLoader = ({ mode }: { mode: 'url' | 'keywords' }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = mode === 'keywords' ? KEYWORD_STEPS : URL_STEPS;

  useEffect(() => {
    setStepIndex(0);
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(interval);
  }, [mode, steps.length]);

  return (
    <div className="bg-gray-950 rounded-xl p-6 font-mono text-sm shadow-2xl border border-gray-800 w-full max-w-2xl mx-auto">
      {/* macOS window chrome */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-3">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-gray-500 ml-2 text-xs">ghost-agent-{mode}.exe</span>
      </div>

      {/* Step output */}
      <div className="space-y-1.5 text-green-400 flex flex-col">
        {steps.slice(0, stepIndex + 1).map((step, idx) => (
          <span key={idx} className="opacity-90 leading-relaxed">
            {step}
          </span>
        ))}
        <span className="animate-pulse w-2 h-4 bg-green-400 inline-block mt-1" />
      </div>

      {/* Platform status grid — only in keywords mode after step 4 */}
      {mode === 'keywords' && stepIndex >= 4 && (
        <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-4 gap-3">
          {PLATFORM_STATUS.map((platform, idx) => {
            const reached = stepIndex >= 4 + idx;
            return (
              <div
                key={platform.key}
                className={`text-xs text-center py-2 px-1 rounded-md border transition-all duration-500 ${
                  reached
                    ? 'border-green-700 bg-green-950 text-green-400'
                    : 'border-gray-800 bg-gray-900 text-gray-600'
                }`}
              >
                <div className="font-bold mb-0.5">
                  {reached ? '✓' : '···'}
                </div>
                <div>{platform.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
