'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, Loader2, CheckCircle, AlertTriangle, Building2, Target, Mic, BrainCircuit } from 'lucide-react';

const toneOptions = [
  'Professional & Direct',
  'Casual & Friendly',
  'Challenger (Provocative)',
  'Data-Driven & Analytical',
];

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Professional & Direct');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('sdr_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCompanyName(data.company_name || '');
        setValueProposition(data.value_proposition || '');
        setTargetAudience(data.target_audience || '');
        setToneOfVoice(data.tone_of_voice || 'Professional & Direct');
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to save settings.' });
      setSaving(false);
      return;
    }

    const { data: existingProfile } = await supabase
      .from('sdr_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from('sdr_profiles')
        .update({ company_name: companyName, value_proposition: valueProposition, target_audience: targetAudience, tone_of_voice: toneOfVoice })
        .eq('user_id', user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('sdr_profiles')
        .insert({ user_id: user.id, company_name: companyName, value_proposition: valueProposition, target_audience: targetAudience, tone_of_voice: toneOfVoice });
      error = insertError;
    }

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Configuration saved. Agent will use this context on next hunt.' });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 rounded-sm font-mono text-sm bg-transparent border border-input text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 placeholder:text-muted-foreground/60";

  const cardSections = [
    {
      field: '01',
      title: 'Company Identity',
      icon: Building2,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10 border-primary/20',
      content: (
        <input
          type="text"
          id="company-name"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Acme Corp"
          className={inputClass}
        />
      ),
    },
    {
      field: '02',
      title: 'Value Proposition',
      icon: BrainCircuit,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20',
      hint: 'What problem do you solve? The AI uses this to write personalized openers.',
      content: (
        <textarea
          id="value-prop"
          rows={4}
          required
          value={valueProposition}
          onChange={(e) => setValueProposition(e.target.value)}
          placeholder="e.g. We help remote engineering teams ship 30% faster by automating CI/CD pipelines."
          className={`${inputClass} resize-vertical`}
        />
      ),
    },
    {
      field: '03',
      title: 'Target ICP',
      icon: Target,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
      content: (
        <input
          type="text"
          id="target-audience"
          required
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="e.g. CTOs and VP Engineering at Series B tech startups"
          className={inputClass}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 px-6 lg:px-8 h-14 flex items-center border-b border-border bg-background">
        <div>
          <h1 className="font-display font-bold text-base uppercase tracking-tight text-foreground">Agent Configuration</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AI context & persona settings</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-background">
        <div className="px-6 lg:px-8 py-8 max-w-3xl space-y-5">
          <form onSubmit={handleSave} className="space-y-5">

            {cardSections.map((section) => (
              <div
                key={section.field}
                className="bg-card border border-border rounded-md p-6 space-y-4 transition-all duration-300 hover:border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 border rounded-sm flex items-center justify-center shrink-0 ${section.iconBg}`}>
                    <section.icon className={`w-4 h-4 ${section.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Field {section.field}</p>
                    <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">{section.title}</h3>
                  </div>
                </div>
                {section.hint && (
                  <p className="font-mono text-[11px] text-muted-foreground">{section.hint}</p>
                )}
                {section.content}
              </div>
            ))}

            {/* Tone Selector */}
            <div className="bg-card border border-border rounded-md p-6 space-y-4 transition-all duration-300 hover:border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Field 04</p>
                  <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">AI Tone of Voice</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {toneOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setToneOfVoice(t)}
                    className={`px-3 py-2.5 rounded-sm text-[11px] font-mono uppercase tracking-wide text-left border transition-all duration-200 ${
                      toneOfVoice === t
                        ? 'bg-primary/10 border-primary/30 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-muted'
                    }`}
                  >
                    {toneOfVoice === t && <span className="text-primary mr-1.5">▸</span>}{t}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {message && (
              <div className={`flex items-start gap-3 p-4 rounded-sm border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20'
                  : 'bg-destructive/5 border-destructive/20'
              }`}>
                {message.type === 'success'
                  ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                }
                <p className={`font-mono text-sm ${message.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:brightness-110 rounded-sm text-primary-foreground text-xs font-mono uppercase tracking-widest transition-all duration-200 glow-primary active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving Config...' : 'Save Configuration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
