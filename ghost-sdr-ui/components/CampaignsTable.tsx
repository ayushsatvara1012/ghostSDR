'use client';

import { useState } from 'react';

// Data Contracts
interface Insight {
  trigger_type: string;
  evidence: string;
  relevance_score: number;
}

interface Lead {
  id: string;
  full_name: string;
  linkedin_url: string;
  headline: string;
  relevance_score: number;
  suggested_opening_line: string;
  key_insights: Insight[];
  status: string;
}

export interface Campaign {
  id: string;
  search_query: string;
  created_at: string;
  status: string;
  leads: Lead[];
}

export function CampaignsTable({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const [campaigns] = useState<Campaign[]>(initialCampaigns);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(
    initialCampaigns.length > 0 ? initialCampaigns[0].id : null
  );

  const toggleCampaign = (id: string) => {
    setExpandedCampaignId(expandedCampaignId === id ? null : id);
  };

  const exportToCsv = (campaign: Campaign) => {
    if (!campaign.leads || campaign.leads.length === 0) return;

    // Build the CSV Header
    const headers = ['Name', 'LinkedIn URL', 'Headline', 'Relevance Score', 'Suggested Opening Line'];
    
    // Build the Rows
    const rows = campaign.leads.map(lead => [
      `"${lead.full_name.replace(/"/g, '""')}"`,
      `"${lead.linkedin_url}"`,
      `"${(lead.headline || '').replace(/"/g, '""')}"`,
      lead.relevance_score,
      `"${lead.suggested_opening_line.replace(/"/g, '""')}"`
    ]);

    // Combine Header and Rows
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    // Create Download Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ghost_SDR_Leads_${campaign.search_query.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mt-6">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">No campaigns found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Head over to the home page to run your first hunt.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
          {/* Campaign Header Row */}
          <div 
            className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleCampaign(campaign.id)}
          >
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg className={`h-5 w-5 transform transition-transform duration-200 ${expandedCampaignId === campaign.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">"{campaign.search_query}"</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {campaign.leads?.length || 0} Leads
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => exportToCsv(campaign)}
                disabled={!campaign.leads || campaign.leads.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Collapsible Leads Table */}
          {expandedCampaignId === campaign.id && (
            <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50">
              {(!campaign.leads || campaign.leads.length === 0) ? (
                <div className="p-6 text-center text-gray-500 text-sm">No leads discovered in this campaign.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-100 dark:bg-gray-900">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prospect</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Opening Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900/50">
                      {campaign.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{lead.full_name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={lead.headline}>{lead.headline}</span>
                              <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1">LinkedIn ↗</a>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              lead.relevance_score >= 9 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' : 
                              lead.relevance_score >= 7 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400' : 
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {lead.relevance_score}/10
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300 italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 py-1 selection:bg-indigo-100 dark:selection:bg-indigo-900">
                              "{lead.suggested_opening_line}"
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
