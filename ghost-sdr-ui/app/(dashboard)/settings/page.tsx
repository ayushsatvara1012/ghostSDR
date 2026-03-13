'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

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
      setMessage({ type: 'success', text: 'Settings saved. Your AI agent will use this context on the next hunt.' });
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Shared input style
  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    borderRadius: '8px',
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-16">
          
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="font-editorial text-3xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Agent Settings
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Define your business context. The AI will use this to qualify leads and craft personalised outreach.
            </p>
          </div>

          {/* Divider */}
          <div className="mb-8" style={{ borderTop: '1px solid var(--border)' }} />

          <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
            {/* ... rest of the form ... */}

        {/* Company */}
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
            Company Name
          </label>
          <input
            type="text"
            id="company-name"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
            style={inputStyle}
          />
        </div>

        {/* Value Prop */}
        <div>
          <label htmlFor="value-prop" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Value Proposition
          </label>
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
            What problem do you solve? Be specific. The AI will use this to write personalized opening lines.
          </p>
          <textarea
            id="value-prop"
            rows={4}
            required
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            placeholder="e.g. We help remote engineering teams ship 30% faster by automating their CI/CD pipelines with real-time Slack incident alerts."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Target Audience */}
        <div>
          <label htmlFor="target-audience" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
            Target Audience (ICP)
          </label>
          <input
            type="text"
            id="target-audience"
            required
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. CTOs and VP Engineering at Series B tech startups"
            style={inputStyle}
          />
        </div>

        {/* Tone */}
        <div>
          <label htmlFor="tone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
            AI Tone of Voice
          </label>
          <select
            id="tone"
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option>Professional &amp; Direct</option>
            <option>Casual &amp; Friendly</option>
            <option>Challenger (Provocative)</option>
            <option>Data-Driven &amp; Analytical</option>
          </select>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className="p-3.5 rounded-lg text-sm"
            style={{
              background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: message.type === 'success' ? '#15803d' : '#dc2626',
            }}
          >
            {message.text}
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
  );
}
