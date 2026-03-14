'use client';

import { useState, useRef, useEffect } from 'react';
import { TerminalLoader } from '@/components/TerminalLoader';
import { Send, Loader2, Link2, Search, AlertTriangle, ChevronRight } from 'lucide-react';

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

function ScoreBadge({ score }: { score: number }) {
  if (score >= 9) return (
    <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm font-mono bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
      {score}/10
    </span>
  );
  if (score >= 7) return (
    <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm font-mono bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
      {score}/10
    </span>
  );
  return (
    <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm font-mono bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30">
      {score}/10
    </span>
  );
}

export default function Home() {
  const [mode, setMode] = useState<'url' | 'keywords'>('keywords');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoutOutput[]>([]);
  const [error, setError] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (results.length > 0 && feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [results, loading]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    setQuery(el.value);
  };

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

      const endpoint = mode === 'url'
        ? 'http://127.0.0.1:8000/api/research'
        : 'http://127.0.0.1:8000/api/hunt';

      const body = mode === 'url'
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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const hasContent = results.length > 0 || loading || error;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto h-full overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="shrink-0 px-6 lg:px-8 min-h-14 flex items-center justify-between border-b border-border bg-background flex-col sm:flex-row">
        <div className='text-center'>
          <h1 className="font-display font-bold text-base uppercase tracking-tight text-foreground">
            Intelligence Hunt
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            AI-powered lead qualification
          </p>
        </div>
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 m-2 bg-card border border-border rounded-sm">
          {(['keywords', 'url'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all duration-200 ${
                mode === m
                  ? 'bg-primary/10 border border-primary/30 text-foreground'
                  : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {m === 'keywords' ? <Search className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {m === 'keywords' ? 'Keywords' : 'URL Enrich'}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE FEED ── */}
      <div ref={feedRef} className="flex-1 overflow-y-auto scrollbar-hide bg-background">
        <div className="px-6 lg:px-8 py-8 space-y-6 max-w-5xl">

          {/* Empty State */}
          {!hasContent && (
            <div className="flex flex-col pt-16 pb-8 place-items-center">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center mb-6">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-tight text-foreground mb-2">
                Target Acquisition
              </h2>
              <p className="font-mono text-sm text-muted-foreground mb-8 max-w-sm">
                Enter keywords or a LinkedIn URL to initiate intelligence gathering.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'VP Engineering, Series B, hiring',
                  'CTO, FinTech startup, NYC',
                  'Head of Sales, SaaS, 50-200 employees',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <ChevronRight className="w-3 h-3 text-primary/60" />
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="font-mono text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Results Feed */}
          {results.length > 0 && (
            <div className="space-y-5">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-md overflow-hidden transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-md tactical-shadow"
                >
                  {/* Profile Header */}
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-muted/40">
                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-xl uppercase tracking-tight text-foreground">
                        {result.full_name}
                      </h2>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {result.current_headline}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm font-mono bg-primary/10 border-primary/30 text-primary">
                        Qualified
                      </span>
                      {result.linkedin_url && (
                        <a
                          href={result.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                        >
                          <Link2 className="w-3 h-3" />
                          Profile
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* AI Opening Line */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20 rounded-sm">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2.5">
                        — Generated Email Opener
                      </p>
                      <p className="font-mono text-sm italic leading-relaxed text-foreground">
                        &ldquo;{result.suggested_opening_line}&rdquo;
                      </p>
                    </div>

                    {/* Insight Cards */}
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                        Qualification Signals
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.key_insights.map((insight, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-muted/40 border border-border rounded-sm flex flex-col gap-2 hover:border-primary/20 transition-colors duration-200"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-mono font-medium text-foreground uppercase tracking-wide leading-tight">
                                {insight.trigger_type}
                              </span>
                              <ScoreBadge score={insight.relevance_score} />
                            </div>
                            <p className="text-[12px] font-mono leading-relaxed text-muted-foreground">
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

          {/* Loader */}
          {loading && (
            <div className="pt-4">
              <TerminalLoader mode={mode} />
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM PROMPT PAD ── */}
      <div className="shrink-0 px-6 lg:px-8 pt-3 pb-5 border-t border-border bg-background">
        <div className="max-w-5xl">
          {/* Prompt Box */}
          <div className="flex items-center gap-3 rounded-sm px-4 py-2 border border-border bg-card transition-all duration-200">
            <textarea
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={
                mode === 'url'
                  ? '> Paste LinkedIn URL to enrich target…'
                  : '> e.g. VP Engineering, Series B, hiring React, New York…'
              }
              className="flex-1 h-full resize-none bg-transparent font-mono text-sm leading-relaxed focus:outline-none focus-visible:!outline-none disabled:opacity-40 text-foreground pr-2 py-1.5"
              style={{ maxHeight: '160px', caretColor: 'hsl(var(--primary))' }}
            />

            {/* Send Button */}
            <button
              onClick={runScout}
              disabled={loading || !query.trim()}
              className="shrink-0 w-8 h-8 rounded-sm flex items-center justify-center transition-all duration-200 bg-primary hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
              aria-label="Execute Hunt"
            >
              {loading
                ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                : <Send className="w-3.5 h-3.5 text-primary-foreground" />
              }
            </button>
          </div>

          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <kbd className="px-1.5 py-0.5 border border-border rounded-sm bg-muted text-[9px]">Enter</kbd> execute ·{' '}
            <kbd className="px-1.5 py-0.5 border border-border rounded-sm bg-muted text-[9px]">Shift+Enter</kbd> new line
          </p>
        </div>
      </div>
    </div>
  );
}