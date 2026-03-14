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

  const { data: recentCampaigns } = await supabase
    .from('campaigns')
    .select('search_query')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8);

  const recentSearches = (recentCampaigns || []).map(c => c.search_query);

  return (
    <div className="min-h-screen bg-background grid-bg text-foreground flex flex-col lg:flex-row overflow-hidden h-screen">
      <Sidebar userEmail={user.email} recentSearches={recentSearches} />
      <main className="flex-1 overflow-y-auto relative flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}
