'use client';

import { useState, useRef, useEffect } from 'react';
import { TerminalLoader } from '@/components/TerminalLoader';
import {
  Send, Loader2, Link2, Search, AlertTriangle, ChevronRight,
  ChevronDown, ChevronUp, Copy, Check, ExternalLink,
  Youtube, MessageSquare, Mic, Newspaper, Linkedin,
} from 'lucide-react';

// ── TypeScript Interfaces (mirror Python Pydantic models exactly) ──────────────

interface IntentSignal {
  platform: string;
  signal_type: string;
  source_url: string;
  source_title: string;
  raw_quote: string;
  author_name: string;
  author_context: string;
  published_at: string;
  keywords_matched: string[];
  intent_score: number;
  timestamp_in_content?: string | null;
}

interface PainPoint {
  description: string;
  evidence_source: string;
  urgency: 'immediate' | 'near-term' | 'strategic';
}

interface LeadProfile {
  full_name: string;
  company_name: string;
  title: string;
  linkedin_url?: string | null;
  email_guess?: string | null;
  company_website?: string | null;
  industry: string;
  company_size_est: string;
  location: string;
  intent_signals: IntentSignal[];
  aggregate_intent_score: number;
  priority_tier: 'A' | 'B' | 'C';
  pain_points: PainPoint[];
  suggested_opening_line: string;
  suggested_hook: string;
  best_channel: string;
  follow_up_angle: string;
  platforms_found_on: string[];
  total_signals_found: number;
}

interface HuntMeta {
  totalSignals: number;
  platforms: string[];
}

// ── Platform Config ────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  youtube:  { icon: Youtube,       label: 'YouTube',  color: 'text-red-500 dark:text-red-400' },
  podcast:  { icon: Mic,           label: 'Podcast',  color: 'text-purple-500 dark:text-purple-400' },
  reddit:   { icon: MessageSquare, label: 'Reddit',   color: 'text-orange-500 dark:text-orange-400' },
  news:     { icon: Newspaper,     label: 'News',     color: 'text-blue-500 dark:text-blue-400' },
  linkedin: { icon: Linkedin,      label: 'LinkedIn', color: 'text-sky-500 dark:text-sky-400' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    immediate: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
    'near-term': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    strategic: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm font-mono ${styles[urgency] || styles['strategic']}`}>
      {urgency}
    </span>
  );
}

function SignalCard({ signal }: { signal: IntentSignal }) {
  const platform = PLATFORM_CONFIG[signal.platform];
  const Icon = platform?.icon;
  const scoreColor = signal.intent_score >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : signal.intent_score >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="p-4 bg-muted/30 border border-border rounded-sm space-y-2.5 hover:border-primary/20 transition-colors">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-3.5 h-3.5 ${platform?.color}`} />}
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {signal.signal_type.replace(/_/g, ' ')}
          </span>
          {signal.timestamp_in_content && (
            <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-sm text-[10px] font-mono text-primary">
              ⏱ {signal.timestamp_in_content}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm font-bold ${scoreColor}`}>{signal.intent_score}</span>
          {signal.source_url && (
            <a href={signal.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Quote */}
      <p className="font-mono text-[11px] italic leading-relaxed text-foreground/80 line-clamp-3">
        &ldquo;{signal.raw_quote}&rdquo;
      </p>

      {/* Source + Date */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-muted-foreground line-clamp-1 max-w-[200px]">
          {signal.source_title}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{signal.published_at}</span>
      </div>

      {/* Keyword badges (first 4) */}
      {signal.keywords_matched?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {signal.keywords_matched.slice(0, 4).map((kw, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-primary/5 border border-primary/15 rounded-sm text-[9px] font-mono text-primary/70">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function IntentScoreBadge({ score, tier }: { score: number; tier: string }) {
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;
  const safeTier = tier || 'C';
  const isA = safeTier === 'A';
  const isB = safeTier === 'B';

  return (
    <div className="flex items-center gap-2">
      <div className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border rounded-sm ${
        isA
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
          : isB
            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
            : 'bg-muted text-muted-foreground border-border'
      }`}>
        TIER {safeTier}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              safeScore >= 80
                ? 'bg-emerald-500'
                : safeScore >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-400'
            }`}
            style={{ width: `${safeScore}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {safeScore}/100
        </span>
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadProfile }) {
  const [painOpen, setPainOpen] = useState(false);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const uniquePlatforms = [...new Set((lead.intent_signals ?? []).map(s => s.platform))];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lead.suggested_opening_line);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-md tactical-shadow">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-border bg-muted/40">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl uppercase tracking-tight text-foreground leading-none">
              {lead.full_name}
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground mt-1">{lead.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-mono text-muted-foreground">{lead.company_name || 'Independent'}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[10px] font-mono text-muted-foreground">{lead.industry || 'Unknown industry'}</span>
              {lead.location && lead.location !== 'Unknown' && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="text-[10px] font-mono text-muted-foreground">{lead.location}</span></>
              )}
              {lead.company_size_est && lead.company_size_est.trim() !== '' && (
                <><span className="text-muted-foreground/40">·</span>
                <span className="text-[10px] font-mono text-muted-foreground">{lead.company_size_est} employees</span></>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lead.linkedin_url && (
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Link2 className="w-3 h-3" />
                Profile
              </a>
            )}
          </div>
        </div>

        {/* Intent score */}
        <div className="mt-4">
          <IntentScoreBadge score={lead.aggregate_intent_score} tier={lead.priority_tier} />
        </div>

        {/* Platform icons */}
        {uniquePlatforms.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Found on:</span>
            {uniquePlatforms.map(p => {
              const cfg = PLATFORM_CONFIG[p];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return <Icon key={p} className={`w-3.5 h-3.5 ${cfg.color}`} title={cfg.label} />;
            })}
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">

        {/* ── Opening Line ── */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20 rounded-sm">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              — Generated Opener
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 border border-emerald-300 dark:border-emerald-700 rounded-sm text-[10px] font-mono text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-all"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="font-mono text-sm italic leading-relaxed text-foreground">
            &ldquo;{lead.suggested_opening_line}&rdquo;
          </p>
        </div>

        {/* ── 3-column quick-facts ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-muted/30 border border-border rounded-sm">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Hook</p>
            <p className="font-mono text-xs text-foreground font-medium">
              {lead.suggested_hook && lead.suggested_hook.trim() !== '' ? lead.suggested_hook : '—'}
            </p>
          </div>
          <div className="p-3 bg-muted/30 border border-border rounded-sm">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Best Channel</p>
            <p className={`font-mono text-xs ${
              lead.best_channel && lead.best_channel.trim() !== '' ? 'text-primary' : 'text-muted-foreground italic'
            }`}>
              {lead.best_channel && lead.best_channel.trim() !== '' ? lead.best_channel : 'LinkedIn DM'}
            </p>
          </div>
          <div className="p-3 bg-muted/30 border border-border rounded-sm">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Follow-up Angle</p>
            <p className="font-mono text-xs text-foreground line-clamp-2">
              {lead.follow_up_angle && lead.follow_up_angle.trim() !== '' ? lead.follow_up_angle : '—'}
            </p>
          </div>
        </div>

        {/* ── Pain Points (collapsible) ── */}
        {(lead.pain_points ?? []).length > 0 && (
          <div>
            <button
              onClick={() => setPainOpen(p => !p)}
              className="flex items-center gap-2 w-full text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              {painOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Pain Points ({lead.pain_points.length})
            </button>
            {painOpen && (
              <div className="space-y-2">
                {lead.pain_points.map((pp, i) => (
                  <div key={i} className="p-3 bg-muted/20 border border-border rounded-sm flex items-start gap-3">
                    <UrgencyBadge urgency={pp.urgency} />
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-foreground leading-relaxed">{pp.description}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">{pp.evidence_source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Intent Signals (collapsible) ── */}
        {(lead.intent_signals ?? []).length > 0 && (
          <div>
            <button
              onClick={() => setSignalsOpen(p => !p)}
              className="flex items-center gap-2 w-full text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              {signalsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Intent Signals ({lead.intent_signals.length})
            </button>
            {signalsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lead.intent_signals.map((sig, i) => (
                  <SignalCard key={i} signal={sig} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        {(lead.email_guess || lead.company_website) && (
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
            {lead.email_guess && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Email (guess):</span>
                <span className="text-[11px] font-mono text-foreground">{lead.email_guess}</span>
              </div>
            )}
            {lead.company_website && (
              <a
                href={lead.company_website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-mono text-primary hover:brightness-110"
              >
                <ExternalLink className="w-3 h-3" />
                {lead.company_website}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (platforms: string[]) => void;
}) {
  const platforms = ['youtube', 'reddit', 'podcast', 'news'] as const;

  const toggle = (platform: string) => {
    if (selected.includes(platform)) {
      if (selected.length === 1) return; // prevent deselecting all
      onChange(selected.filter(p => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mr-1">Platforms:</span>
      {platforms.map(p => {
        const cfg = PLATFORM_CONFIG[p];
        const Icon = cfg.icon;
        const active = selected.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[10px] font-mono uppercase tracking-wide transition-all duration-200 ${
              active
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-muted'
            }`}
          >
            <Icon className={`w-3 h-3 ${active ? cfg.color : 'text-muted-foreground'}`} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [mode, setMode] = useState<'keywords' | 'url'>('keywords');
  const [query, setQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'reddit', 'news', 'podcast']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadProfile[]>([]);
  const [error, setError] = useState('');
  const [huntMeta, setHuntMeta] = useState<HuntMeta | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if ((results.length > 0 || loading) && feedRef.current) {
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
    setHuntMeta(null);

    try {
      const supabase = (await import('@/utils/supabase/client')).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to hunt leads.');

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

      let response: Response;
      if (mode === 'url') {
        response = await fetch(`${API_BASE_URL}/api/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkedin_url: query }),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/hunt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: query,
            user_id: user.id,
            platforms: selectedPlatforms,
            industry_hint: 'general',
            max_leads: 5,
          }),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Hunt failed — check the backend logs.');
      }

      const data = await response.json();

      if (mode === 'url') {
        setResults(prev => [...prev, data]);
      } else {
        setResults(prev => [...prev, ...(data.results ?? [])]);
        setHuntMeta({
          totalSignals: data.total_signals_harvested ?? 0,
          platforms: data.platforms_searched ?? [],
        });
        if (data.harvest_warning) {
          console.warn('Harvest warning:', data.harvest_warning);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
      <div className="shrink-0 px-6 lg:px-8 min-h-14 flex items-center justify-between border-b border-border bg-background flex-col sm:flex-row gap-2 py-3">
        <div className="text-center sm:text-left">
          <h1 className="font-display font-bold text-base uppercase tracking-tight text-foreground">
            Intelligence Hunt
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Multi-platform AI lead qualification · Claude Sonnet 4.6
          </p>
        </div>
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-sm">
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
              <p className="font-mono text-sm text-muted-foreground mb-8 max-w-sm text-center">
                Enter keywords to hunt multi-platform intent signals, or paste a LinkedIn URL to enrich a target.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'startup burning runway engineering costs too expensive developers',
                  'startup Upwork Fiverr bad developer experience quality problems',
                  'SaaS founder building B2B product need developers ship faster launch',
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

          {/* Hunt Meta Banner */}
          {huntMeta && (
            <div className={`flex flex-wrap items-center gap-2 p-3 border rounded-sm font-mono text-[11px] ${
              huntMeta.totalSignals === 0
                ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20'
                : 'bg-primary/5 border-primary/20'
            }`}>
              <span className={`font-bold ${
                huntMeta.totalSignals === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
              }`}>
                {huntMeta.totalSignals}
              </span>
              <span className="text-muted-foreground">
                signals harvested
                {huntMeta.totalSignals === 0 && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">— check SERPER_API_KEY</span>
                )}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Platforms: {huntMeta.platforms.join(', ')}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{results.length}</span> leads qualified
              </span>
            </div>
          )}

          {/* Results Feed */}
          {results.length > 0 && (
            <div className="space-y-5">
              {results.map((result, index) => (
                <LeadCard key={index} lead={result} />
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
      <div className="shrink-0 px-6 lg:px-8 pt-3 pb-5 border-t border-border bg-background space-y-2.5">
        {/* Platform Selector — keywords mode only */}
        {mode === 'keywords' && (
          <PlatformSelector selected={selectedPlatforms} onChange={setSelectedPlatforms} />
        )}

        {/* Prompt Box */}
        <div className="flex items-center gap-3 rounded-sm px-4 py-2 border border-border bg-card transition-all duration-200 focus-within:border-primary/40">
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
                : '> e.g. fine chemicals manufacturing need buy solvents…'
            }
            className="flex-1 h-full resize-none bg-transparent font-mono text-sm leading-relaxed focus:outline-none focus-visible:!outline-none disabled:opacity-40 text-foreground pr-2 py-1.5"
            style={{ maxHeight: '160px', caretColor: 'hsl(var(--primary))' }}
          />
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

        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <kbd className="px-1.5 py-0.5 border border-border rounded-sm bg-muted text-[9px]">Enter</kbd> execute ·{' '}
          <kbd className="px-1.5 py-0.5 border border-border rounded-sm bg-muted text-[9px]">Shift+Enter</kbd> new line
        </p>
      </div>
    </div>
  );
}