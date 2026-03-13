'use client';

import { useState, useRef, useEffect } from 'react';
import { TerminalLoader } from '@/components/TerminalLoader';

interface SalesTrigger {
  trigger_type: string;
  evidence: string;
  relevance_score: number;
}

interface ScoutOutput {
  full_name: string;
  linkedin_url: string;
  current_headline: string;
  key_insights: SalesTrigger[];
  suggested_opening_line: string;
}

export default function Home() {
  const [mode, setMode] = useState<'url' | 'keywords'>('keywords');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoutOutput[]>([]);
  const [error, setError] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new results land
  useEffect(() => {
    if (results.length > 0 && feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [results, loading]);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    setQuery(el.value);
  };

  // Submit on Enter (not Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && query.trim()) runScout();
    }
  };

  const runScout = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');

    try {
      const supabase = (await import('@/utils/supabase/client')).createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Please sign in to hunt leads.');

      const endpoint =
        mode === 'url' ? 'http://127.0.0.1:8000/api/research' : 'http://127.0.0.1:8000/api/hunt';

      const body =
        mode === 'url'
          ? { linkedin_url: query }
          : { keywords: query, user_id: user.id };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch data');
      }

      const data = await response.json();
      const newResults = mode === 'url' ? [data] : data.results;
      setResults(prev => [...prev, ...newResults]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setQuery('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const hasContent = results.length > 0 || loading || error;

  return (
    // Unified Dashboard Page Structure
    <div className="flex flex-col h-full overflow-hidden">

      {/* ============================
          SCROLLABLE CONTENT AREA
      ============================== */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-16 pb-32">
          
          {/* Welcome / Empty State */}
          {!hasContent && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
              <h1 className="font-editorial text-4xl font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                Good morning.
              </h1>
              <p className="text-base mb-8" style={{ color: 'var(--muted)' }}>
                Who are you hunting for today?
              </p>
              {/* Mode Toggle — centered in the empty state too */}
              <div className="flex rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {(['keywords', 'url'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="px-5 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      background: mode === m ? 'var(--background)' : 'transparent',
                      color: mode === m ? 'var(--foreground)' : 'var(--muted)',
                      boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {m === 'keywords' ? 'Hunt by Keywords' : 'Enrich a URL'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              ⚠ {error}
            </div>
          )}

          {/* Results Feed */}
          {results.length > 0 && (
            <div className="space-y-8">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border)', background: 'var(--background)' }}
                >
                  {/* Profile Header */}
                  <div
                    className="px-7 py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
                  >
                    <div>
                      <h2 className="font-editorial text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                        {result.full_name}
                      </h2>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                        {result.current_headline}
                      </p>
                    </div>
                    {result.linkedin_url && (
                      <a
                        href={result.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap self-start"
                        style={{ border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--background)' }}
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>

                  <div className="p-7 space-y-6">
                    {/* AI Opening Line */}
                    <div className="p-5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--accent)' }}>
                        Generated Email Opener
                      </p>
                      <p className="font-editorial text-base italic leading-relaxed" style={{ color: 'var(--foreground)' }}>
                        &ldquo;{result.suggested_opening_line}&rdquo;
                      </p>
                    </div>

                    {/* Insight Cards */}
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>
                        Qualification Signals
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.key_insights.map((insight, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl flex flex-col gap-2"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                {insight.trigger_type}
                              </span>
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{
                                  background: insight.relevance_score >= 9 ? '#f0fdf4' : insight.relevance_score >= 7 ? '#fffbeb' : 'var(--border)',
                                  color: insight.relevance_score >= 9 ? '#15803d' : insight.relevance_score >= 7 ? '#92400e' : 'var(--muted)',
                                }}
                              >
                                {insight.relevance_score}/10
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                              {insight.evidence}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Terminal Loader */}
          {loading && (
            <div className="mt-8">
              <TerminalLoader mode={mode} />
            </div>
          )}
        </div>
      </div>

      {/* ============================
          BOTTOM PROMPT PAD
      ============================== */}
      <div
        className="shrink-0 px-6 py-4"
        style={{
          borderTop: hasContent ? '1px solid var(--border)' : 'none',
          background: 'var(--background)',
        }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Mode toggle — shown above the box when there's content */}
          {hasContent && (
            <div className="flex mb-2">
              <div className="flex rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {(['keywords', 'url'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: mode === m ? 'var(--background)' : 'transparent',
                      color: mode === m ? 'var(--foreground)' : 'var(--muted)',
                      boxShadow: mode === m ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {m === 'keywords' ? 'Hunt by Keywords' : 'Enrich a URL'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* The AI-style prompt box */}
          <div
            className="relative flex items-end gap-3 rounded-2xl px-4 py-3"
            style={{
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={
                mode === 'url'
                  ? 'Paste a LinkedIn URL to enrich…'
                  : 'e.g. VP Engineering, Series B startup, hiring React, New York…'
              }
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none disabled:opacity-60"
              style={{
                color: 'var(--foreground)',
                maxHeight: '160px',
                caretColor: 'var(--accent)',
              }}
            />

            {/* Submit button */}
            <button
              onClick={runScout}
              disabled={loading || !query.trim()}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
            Press <kbd style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}>Enter</kbd> to hunt · <kbd style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}>Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}