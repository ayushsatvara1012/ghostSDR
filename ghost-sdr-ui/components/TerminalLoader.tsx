'use client';

import { useState, useEffect } from 'react';

export const TerminalLoader = ({ mode }: { mode: 'url' | 'keywords' }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps =
    mode === 'keywords'
      ? [
          '> Initializing Ghost SDR Hunter Protocol...',
          '> Injecting Google Dorks for LinkedIn intent...',
          '> Scraping top 3 SERP results...',
          '> Booting Claude Sonnet 4.6 Lead Qualifier...',
          '> Evaluating relevance & generating custom openers...',
          '> Compiling target list...',
        ]
      : [
          '> Initializing Ghost SDR Enricher...',
          '> Bypassing auth walls via OSINT...',
          '> Booting Claude Sonnet 4.6 Brain...',
          '> Synthesizing intent-based sales triggers...',
          '> Formatting JSON payload...',
        ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm shadow-2xl border border-gray-700 w-full max-w-2xl mx-auto mt-8">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-gray-400 ml-2 text-xs">ghost-agent-{mode}.exe</span>
      </div>
      <div className="space-y-2 text-green-400 flex flex-col">
        {steps.slice(0, stepIndex + 1).map((step, idx) => (
          <span key={idx} className="opacity-90">
            {step}
          </span>
        ))}
        <span className="animate-pulse w-2 h-4 bg-green-400 inline-block mt-1"></span>
      </div>
    </div>
  );
};
