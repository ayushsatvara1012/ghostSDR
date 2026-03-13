import { createClient } from '@/utils/supabase/server';
import { CampaignsTable, type Campaign } from '@/components/CampaignsTable';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sales Pipeline — Ghost SDR',
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: campaignsData } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const campaignIds = campaignsData?.map(c => c.id) || [];
  
  let leadsData: any[] = [];
  if (campaignIds.length > 0) {
    const { data: fetchedLeads } = await supabase
      .from('leads')
      .select('*')
      .in('campaign_id', campaignIds)
      .order('relevance_score', { ascending: false });
    if (fetchedLeads) leadsData = fetchedLeads;
  }

  const campaigns: Campaign[] = (campaignsData || []).map(c => ({
    ...c,
    leads: leadsData.filter(l => l.campaign_id === c.id)
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-16">
          
          {/* Page Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h1 className="font-editorial text-3xl font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>
                Sales Pipeline
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                All your hunts, AI-qualified leads, and outreach lines in one place.
              </p>
            </div>
            <a
              href="/"
              className="text-sm px-4 py-2 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              New Hunt
            </a>
          </div>

          {/* Divider */}
          <div className="mb-8" style={{ borderTop: '1px solid var(--border)' }} />

          <CampaignsTable initialCampaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
