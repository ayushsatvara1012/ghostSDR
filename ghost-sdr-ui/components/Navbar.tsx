'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export function Navbar({ userEmail }: { userEmail?: string | null }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }} className="sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-14">

          {/* Logo — Serif wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold transition-opacity group-hover:opacity-80"
              style={{ background: 'var(--accent)' }}
            >
              G
            </div>
            <span className="font-editorial font-semibold text-base tracking-tight" style={{ color: 'var(--foreground)' }}>
              Ghost SDR
            </span>
          </Link>

          {/* Right nav */}
          <div className="flex items-center gap-6">
            {userEmail ? (
              <>
                <Link
                  href="/campaigns"
                  className="text-sm transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Pipeline
                </Link>
                <Link
                  href="/settings"
                  className="text-sm transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Settings
                </Link>

                <span className="text-sm hidden md:block truncate max-w-[160px]" style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {userEmail}
                </span>

                <button
                  onClick={handleSignOut}
                  className="text-sm px-3.5 py-1.5 rounded-lg transition-all"
                  style={{
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    background: 'transparent',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm px-4 py-1.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)', fontSize: '13px' }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
