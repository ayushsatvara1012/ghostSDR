'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { Crosshair, GitBranch, Settings, LogOut, Menu, X, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SidebarProps {
  userEmail?: string | null;
  recentSearches?: string[];
}

const navItems = [
  { href: '/', label: 'New Hunt', icon: Crosshair },
  { href: '/campaigns', label: 'Pipeline', icon: GitBranch },
  { href: '/settings', label: 'Agent Config', icon: Settings },
];

export function Sidebar({ userEmail, recentSearches = [] }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const userInitial = userEmail?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/15 border border-primary/30 rounded-sm flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-display font-bold uppercase tracking-tight text-sm text-foreground">Ghost SDR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div
            className="w-7 h-7 bg-emerald-500/15 border border-emerald-500/30 rounded-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold"
            title={userEmail ?? ''}
          >
            {userInitial}
          </div>
        </div>
      </header>

      {/* ── MOBILE BACKDROP ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          flex flex-col h-screen z-[60] shrink-0
          fixed lg:sticky top-0 left-0
          w-64 bg-card border-r border-border
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-3 group min-w-0">
            <div className="w-8 h-8 bg-primary/15 border border-primary/30 rounded-sm flex items-center justify-center transition-all duration-300 shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm uppercase tracking-tight text-foreground leading-none">Ghost SDR</p>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">v2.4 · TACTICAL</p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav Section Label */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Navigation</p>
        </div>

        {/* Nav Items */}
        <nav className="px-3 flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium uppercase tracking-wide
                  transition-all duration-200 ease-in-out group
                  ${active
                    ? 'bg-primary/10 border border-primary/30 text-foreground'
                    : 'border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span>{label}</span>
                {active && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Recent Hunts */}
        {recentSearches.length > 0 && (
          <div className="px-5 pt-6 pb-2 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Recent Hunts</p>
            <div className="flex flex-col gap-0.5">
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-2 py-1.5 rounded-sm text-[11px] font-mono truncate text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                >
                  <span className="text-primary/50 mr-1.5">{'>'}</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {!recentSearches.length && <div className="flex-1" />}

        {/* System Status Bar */}
        <div className="px-5 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Agent Online</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-emerald-500/15 border border-emerald-500/30 rounded-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-mono truncate text-foreground">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
