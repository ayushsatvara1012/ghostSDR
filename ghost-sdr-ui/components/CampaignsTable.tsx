'use client';

import { useState } from 'react';

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

  const toggleCampaign = (id: string) =>
    setExpandedCampaignId(expandedCampaignId === id ? null : id);

  const exportToCsv = (campaign: Campaign) => {
    if (!campaign.leads?.length) return;
    const headers = ['Name', 'LinkedIn URL', 'Headline', 'Relevance Score', 'AI Opening Line'];
    const rows = campaign.leads.map(lead => [
      `"${lead.full_name.replace(/"/g, '""')}"`,
      `"${lead.linkedin_url || ''}"`,
      `"${(lead.headline || '').replace(/"/g, '""')}"`,
      lead.relevance_score,
      `"${(lead.suggested_opening_line || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GhostSDR_${campaign.search_query.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border-[var(--border)] bg-[var(--surface)] border">
        <p className="font-editorial text-lg mb-2 text-[var(--foreground)]">No campaigns yet</p>
        <p className="text-sm text-[var(--muted)]">
          Run your first hunt from the{' '}
          <a href="/" className="text-[var(--accent)] font-semibold">home page</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="rounded-2xl overflow-hidden transition-all border-[var(--border)] bg-[var(--background)] border"
        >
          {/* Campaign header row */}
          <div
            className="px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-[var(--surface)]"
            style={{ borderBottom: expandedCampaignId === campaign.id ? '1px solid var(--border)' : 'none' }}
            onClick={() => toggleCampaign(campaign.id)}
          >
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <svg
                className={`h-4 w-4 shrink-0 transition-transform duration-200 text-[var(--muted)] ${expandedCampaignId === campaign.id ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <div className="truncate">
                <p className="font-semibold text-sm text-[var(--foreground)] truncate">
                  &ldquo;{campaign.search_query}&rdquo;
                </p>
                <p className="text-[10px] md:text-xs mt-0.5 text-[var(--muted)] uppercase font-bold tracking-wider">
                  {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' · '}
                  <span className="text-[var(--accent)]">{campaign.leads?.length || 0} leads</span>
                </p>
              </div>
            </div>

            <div onClick={(e) => e.stopPropagation()} className="ml-2">
              <button
                onClick={() => exportToCsv(campaign)}
                disabled={!campaign.leads?.length}
                className="text-[10px] md:text-xs px-2.5 md:px-3.5 py-1.5 rounded-lg border-[var(--border)] text-[var(--foreground)] bg-transparent border hover:bg-[var(--surface)] transition-colors disabled:opacity-40"
              >
                CSV
              </button>
            </div>
          </div>

          {/* Leads — Responsive View */}
          {expandedCampaignId === campaign.id && (
            <div className="bg-[var(--surface)]">
              {!campaign.leads?.length ? (
                <p className="p-6 text-sm text-center text-[var(--muted)]">No leads in this campaign.</p>
              ) : (
                <>
                  {/* MOBILE VIEW — Card-based (Hidden on desktop) */}
                  <div className="md:hidden divide-y divide-[var(--border)]">
                    {campaign.leads.map((lead) => (
                      <div key={lead.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[var(--foreground)]">{lead.full_name}</p>
                            <p className="text-xs text-[var(--muted)] truncate mt-0.5">{lead.headline}</p>
                          </div>
                          <ScoreBadge score={lead.relevance_score} />
                        </div>
                        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                           <p className="text-xs text-[var(--muted)] font-bold uppercase tracking-widest mb-1.5 scale-90 origin-left">Targeting Opener</p>
                           <p className="text-xs italic leading-relaxed text-[var(--foreground)]">&ldquo;{lead.suggested_opening_line}&rdquo;</p>
                        </div>
                        {lead.linkedin_url && (
                          <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                            LinkedIn ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW — Table-based (Hidden on mobile) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Prospect</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Score</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">AI Opener</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.leads.map((lead) => (
                          <tr key={lead.id} className="border-b border-[var(--border)] last:border-0">
                            <td className="px-6 py-5">
                              <p className="font-bold text-sm text-[var(--foreground)]">{lead.full_name}</p>
                              <p className="text-xs mt-0.5 truncate max-w-[180px] text-[var(--muted)]" title={lead.headline}>{lead.headline}</p>
                              {lead.linkedin_url && (
                                <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest mt-2 block text-[var(--accent)]">LinkedIn ↗</a>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap align-top pt-6">
                              <ScoreBadge score={lead.relevance_score} />
                            </td>
                            <td className="px-6 py-5 md:max-w-xs lg:max-w-md">
                              <div className="border-l-2 border-[var(--accent)] pl-4 py-1">
                                <p className="text-sm italic leading-relaxed text-[var(--foreground)]">&ldquo;{lead.suggested_opening_line}&rdquo;</p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const isHigh = score >= 9;
  const isMid = score >= 7;
  
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{
        background: isHigh ? 'rgba(20, 184, 166, 0.1)' : isMid ? 'rgba(217, 119, 87, 0.1)' : 'rgba(122, 117, 112, 0.1)',
        borderColor: isHigh ? 'rgba(20, 184, 166, 0.2)' : isMid ? 'rgba(217, 119, 87, 0.2)' : 'rgba(122, 117, 112, 0.2)',
        color: isHigh ? '#14b8a6' : isMid ? '#d97757' : 'var(--muted)',
      }}
    >
      {score}/10
    </span>
  );
}
