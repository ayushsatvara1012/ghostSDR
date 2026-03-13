import { createClient } from '@/utils/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch recent searches for sidebar history
  const { data: recentCampaigns } = await supabase
    .from('campaigns')
    .select('search_query')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8);

  const recentSearches = (recentCampaigns || []).map(c => c.search_query);

  return (
    // Full-screen flex shell — AI Chat App pattern
    // Mobile: column direction (Sidebar/Nav at bottom), Desktop: row direction
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Responsive Sidebar component handles its own MD hide/show logic */}
      <Sidebar userEmail={user.email} recentSearches={recentSearches} />

      {/* Scrollable Main Area */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
