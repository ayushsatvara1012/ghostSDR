import { createClient } from '@/utils/supabase/server';
import { CampaignsTable, type Campaign } from '@/components/CampaignsTable';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Campaigns Pipeline | Ghost SDR',
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch campaigns for this user, ordered by newest first
  const { data: campaignsData, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (campaignsError) {
    console.error('Failed to load campaigns:', campaignsError);
  }

  // Fetch leads for these campaigns
  // In a massive app you might paginate or load leads on demand,
  // but for the V1 CRM we fetch them all to enable instant CSV exports.
  const campaignIds = campaignsData?.map(c => c.id) || [];
  
  let leadsData: any[] = [];
  if (campaignIds.length > 0) {
    const { data: fetchedLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('campaign_id', campaignIds)
      .order('relevance_score', { ascending: false });
      
    if (!leadsError && fetchedLeads) {
      leadsData = fetchedLeads;
    }
  }

  // Stitch them together
  const campaigns: Campaign[] = (campaignsData || []).map(c => ({
    ...c,
    leads: leadsData.filter(l => l.campaign_id === c.id)
  }));

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold leading-7 text-gray-900 dark:text-white sm:text-4xl sm:truncate">
            Sales Pipeline
          </h2>
          <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
            View your historic hunts, review AI-qualified leads, and export to CSV for your email sequences.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Hunt New Leads
          </a>
        </div>
      </div>

      <CampaignsTable initialCampaigns={campaigns} />
    </div>
  );
}
