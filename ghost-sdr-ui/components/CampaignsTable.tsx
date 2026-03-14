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
      <div className="text-center py-20 rounded-sm border border-border bg-card grid-bg">
        <p className="font-display font-bold text-lg mb-2 text-foreground uppercase tracking-tight">No intelligence acquired yet</p>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          Run your first hunt from the{' '}
          <a href="/" className="text-primary font-bold hover:brightness-110 underline-offset-4 hover:underline">COMMAND CENTER</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="rounded-sm overflow-hidden transition-all duration-300 border border-border bg-card hover:border-primary/30 shadow-sm"
        >
          {/* Campaign header row */}
          <div
            className={`px-4 md:px-6 py-4 flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
              expandedCampaignId === campaign.id ? 'border-b border-border bg-muted/30' : ''
            }`}
            onClick={() => toggleCampaign(campaign.id)}
          >
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <svg
                className={`h-4 w-4 shrink-0 transition-transform duration-300 text-muted-foreground ${
                  expandedCampaignId === campaign.id ? 'rotate-90 text-primary' : ''
                }`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <div className="truncate">
                <p className="font-display font-bold text-sm text-foreground truncate uppercase tracking-tight">
                  {campaign.search_query}
                </p>
                <p className="font-mono text-[10px] md:text-xs mt-0.5 text-muted-foreground uppercase tracking-widest">
                  {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' · '}
                  <span className="text-primary font-bold">{campaign.leads?.length || 0} LEADS</span>
                </p>
              </div>
            </div>

            <div onClick={(e) => e.stopPropagation()} className="ml-2">
              <button
                onClick={() => exportToCsv(campaign)}
                disabled={!campaign.leads?.length}
                className="text-[10px] px-3 py-1.5 rounded-sm border border-border text-foreground bg-transparent font-mono uppercase tracking-widest hover:bg-background hover:border-primary/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
              >
                EXPORT CSV
              </button>
            </div>
          </div>

          {/* Smooth Accordion Content */}
          <div 
            className={`grid transition-all duration-300 ease-in-out ${
              expandedCampaignId === campaign.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="bg-muted/10">
                {!campaign.leads?.length ? (
                  <p className="p-6 font-mono text-xs text-center text-muted-foreground uppercase tracking-widest">No leads acquired in this hunt.</p>
                ) : (
                  <>
                    {/* MOBILE VIEW — Card-based */}
                    <div className="md:hidden divide-y divide-border">
                      {campaign.leads.map((lead) => (
                        <div key={lead.id} className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground">{lead.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.headline}</p>
                            </div>
                            <ScoreBadge score={lead.relevance_score} />
                          </div>
                          <div className="p-3 rounded-sm border border-border bg-background/50">
                             <p className="text-[10px] text-primary font-mono uppercase tracking-[0.2em] mb-2">TARGETING_OPENER_AI</p>
                             <p className="text-xs italic leading-relaxed text-foreground">&ldquo;{lead.suggested_opening_line}&rdquo;</p>
                          </div>
                          {lead.linkedin_url && (
                            <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-primary hover:brightness-110">
                              VIEW_DOSSIER ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* DESKTOP VIEW — Table-based */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="px-6 py-4 text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Prospect_ID</th>
                            <th className="px-6 py-4 text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Score</th>
                            <th className="px-6 py-4 text-left text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Tactical_Opener</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {campaign.leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-primary/5 transition-colors group">
                              <td className="px-6 py-5">
                                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{lead.full_name}</p>
                                <p className="text-xs mt-0.5 truncate max-w-[200px] text-muted-foreground font-mono" title={lead.headline}>{lead.headline}</p>
                                {lead.linkedin_url && (
                                  <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="text-[10px] font-mono uppercase tracking-widest mt-2 flex items-center gap-1 text-primary hover:brightness-125 transition-all">
                                    DOSSIER ↗
                                  </a>
                                )}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap align-top pt-6">
                                <ScoreBadge score={lead.relevance_score} />
                              </td>
                              <td className="px-6 py-5 md:max-w-xs lg:max-w-md">
                                <div className="border-l border-primary/30 pl-4 py-1.5 bg-background/30 rounded-r-sm">
                                  <p className="text-xs italic leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors font-mono">&ldquo;{lead.suggested_opening_line}&rdquo;</p>
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
            </div>
          </div>
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
      className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-wider ${
        isHigh 
          ? 'bg-emerald-500 text-white border-emerald-400' 
          : isMid 
            ? 'bg-amber-500 text-white border-amber-400' 
            : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {score}/10
    </span>
  );
}
