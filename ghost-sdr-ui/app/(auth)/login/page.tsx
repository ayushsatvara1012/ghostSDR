'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Zap, Loader2, AlertTriangle, CheckCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setSuccess('Identity confirmed. Authenticate to proceed.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  const inputClass = "w-full px-4 py-3 rounded-sm font-mono text-sm bg-transparent border border-input text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 placeholder:text-muted-foreground/60";

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-10">
          <div className="w-10 h-10 bg-primary/15 border border-primary/30 rounded-sm flex items-center justify-center mb-6">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl uppercase tracking-tight text-foreground mb-1">
            System Access
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            Ghost SDR · Tactical Intelligence Platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Operator ID (Email)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="e.g. operator@company.com"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Auth Token (Password)
              </label>
              <Link href="/forgot-password" className="text-[10px] font-mono uppercase tracking-widest text-primary/70 hover:text-primary transition-colors">
                Reset
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter auth token…"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {success && (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20 rounded-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{success}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:brightness-110 rounded-sm text-primary-foreground text-xs font-mono uppercase tracking-widest transition-all duration-200 glow-primary active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
        </form>

        <p className="mt-8 font-mono text-xs text-muted-foreground">
          No access credentials?{' '}
          <Link href="/signup" className="text-primary hover:brightness-110 transition-colors uppercase tracking-wider">
            Request Access
          </Link>
        </p>

        {/* Badge */}
        <div className="mt-12 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Secure · Encrypted · Zero-Data-Retention
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
