'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

interface SidebarProps {
  userEmail?: string | null;
  recentSearches?: string[];
}

export function Sidebar({ userEmail, recentSearches = [] }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* MOBILE TOP HEADER — Only visible on small screens */}
      <header 
        className="md:hidden flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent)' }}>G</div>
          <span className="font-editorial font-bold text-sm tracking-tight" style={{ color: 'var(--foreground)' }}>Ghost SDR</span>
        </Link>
        {userEmail && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ background: 'var(--accent)' }}>
            {userEmail[0].toUpperCase()}
          </div>
        )}
      </header>

      {/* DESKTOP SIDEBAR — Hidden on mobile (hidden md:flex) */}
      <aside
        className="hidden md:flex flex-col h-full select-none"
        style={{
          width: collapsed ? '68px' : '260px',
          minWidth: collapsed ? '68px' : '260px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Top Section */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-4 px-1">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--accent)' }}>G</div>
                <span className="font-editorial font-bold text-base tracking-tight" style={{ color: 'var(--foreground)' }}>Ghost SDR</span>
              </Link>
            )}
            {collapsed && (
              <Link href="/" className="mx-auto">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--accent)' }}>G</div>
              </Link>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-(--border) transition-colors text-(--muted) hover:text-foreground"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {collapsed
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                }
              </svg>
            </button>
          </div>

          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ 
              background: pathname === '/' ? 'var(--border)' : 'transparent',
              color: 'var(--foreground)',
            }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {!collapsed && <span>New Hunt</span>}
          </Link>
        </div>

        <div className="px-4 py-2 flex flex-col gap-1 overflow-y-auto flex-1">
          {!collapsed && <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 px-3 text-[var(--muted)]">Core</p>}
          <DesktopNavLink href="/campaigns" label="Pipeline" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>} active={isActive('/campaigns')} collapsed={collapsed} />
          <DesktopNavLink href="/settings" label="Settings" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} active={isActive('/settings')} collapsed={collapsed} />

          {!collapsed && recentSearches.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 px-3 text-[var(--muted)]">History</p>
              {recentSearches.map((s, i) => (
                <button key={i} className="w-full text-left px-3 py-2 rounded-lg text-xs truncate text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--border)] overflow-hidden">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--accent)' }}>
              {userEmail?.[0].toUpperCase() || '?'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-[var(--foreground)]">{userEmail}</p>
                <button onClick={handleSignOut} className="text-[10px] text-[var(--muted)] hover:text-red-500 transition-colors font-semibold">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION — Only visible on small screens (md:hidden) */}
      <nav 
        className="md:hidden flex items-center justify-around h-16 border-t shrink-0 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <MobileNavLink href="/" label="Hunt" active={isActive('/')} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        <MobileNavLink href="/campaigns" label="Pipeline" active={isActive('/campaigns')} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>} />
        <MobileNavLink href="/settings" label="Config" active={isActive('/settings')} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      </nav>
    </>
  );
}

function DesktopNavLink({ href, label, icon, active, collapsed }: { href: string; label: string; icon: React.ReactNode; active: boolean; collapsed: boolean; }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-[var(--border)] text-[var(--foreground)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]'}`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function MobileNavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean; }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 transition-colors"
      style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </Link>
  );
}
