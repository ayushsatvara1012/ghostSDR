'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Zap, Loader2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-sm font-mono text-sm bg-transparent border border-input text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 placeholder:text-muted-foreground/60";

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-10">
          <div className="w-10 h-10 bg-emerald-100 border border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/40 rounded-sm flex items-center justify-center mb-6">
            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="font-display font-bold text-3xl uppercase tracking-tight text-foreground mb-1">
            Register Operator
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            Create your Ghost SDR operator account
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSignup} className="space-y-4">
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
                placeholder="operator@company.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Auth Token (Password)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Create a strong passphrase"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-sm">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-sm text-white text-xs font-mono uppercase tracking-widest transition-all duration-200 glow-success active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating Profile...' : 'Register Account'}
            </button>
          </form>
        ) : (
          /* Success State */
          <div className="p-6 bg-card border border-emerald-200 dark:border-emerald-500/20 rounded-md">
            <div className="w-10 h-10 bg-emerald-100 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-sm flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Status: Provisioned</p>
            <h3 className="font-display font-bold text-xl uppercase tracking-tight text-foreground mb-2">Account Created</h3>
            <p className="font-mono text-sm text-muted-foreground mb-6">
              Your operator profile has been provisioned. Proceed to authentication.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:brightness-110 rounded-sm text-primary-foreground text-xs font-mono uppercase tracking-widest transition-all duration-200 glow-primary"
            >
              <ArrowRight className="w-4 h-4" />
              Proceed to Login
            </Link>
          </div>
        )}

        <p className="mt-8 font-mono text-xs text-muted-foreground">
          Already registered?{' '}
          <Link href="/login" className="text-primary hover:brightness-110 transition-colors uppercase tracking-wider">
            Authenticate
          </Link>
        </p>

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
