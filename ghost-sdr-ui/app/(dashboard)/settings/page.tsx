'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Professional');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('sdr_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCompanyName(data.company_name || '');
        setValueProposition(data.value_proposition || '');
        setTargetAudience(data.target_audience || '');
        setToneOfVoice(data.tone_of_voice || 'Professional');
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

    // First, check if a profile exists
    const { data: existingProfile } = await supabase
      .from('sdr_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;

    if (existingProfile) {
      // Update existing
      const { error: updateError } = await supabase
        .from('sdr_profiles')
        .update({
          company_name: companyName,
          value_proposition: valueProposition,
          target_audience: targetAudience,
          tone_of_voice: toneOfVoice,
        })
        .eq('user_id', user.id);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('sdr_profiles')
        .insert({
          user_id: user.id,
          company_name: companyName,
          value_proposition: valueProposition,
          target_audience: targetAudience,
          tone_of_voice: toneOfVoice,
        });
      error = insertError;
    }

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Settings saved! The AI will now use this context.' });
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold leading-7 text-gray-900 dark:text-white sm:text-4xl sm:truncate">
            AI Agent Settings
          </h2>
          <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
            Configure how the AI evaluates leads and writes cold outreach exactly for your business.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 sm:rounded-xl overflow-hidden">
        <form onSubmit={handleSave} className="space-y-6 p-6 sm:p-8">
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            
            <div className="sm:col-span-6">
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="company-name"
                  id="company-name"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="value-prop" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Value Proposition
              </label>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                What problem do you solve? How do you help your customers? The AI will use this to qualify leads.
              </p>
              <div className="mt-2">
                <textarea
                  id="value-prop"
                  name="value-prop"
                  rows={4}
                  required
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="e.g. We help remote engineering teams ship 30% faster by automating their CI/CD pipelines and providing real-time Slack incident alerts."
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="target-audience" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Audience (Ideal Customer Profile)
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="target-audience"
                  id="target-audience"
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. VP of Engineering and CTOs at series B tech startups"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Tone of Voice
              </label>
              <div className="mt-2">
                <select
                  id="tone"
                  name="tone"
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3 border transition-colors"
                >
                  <option>Professional & Direct</option>
                  <option>Casual & Friendly</option>
                  <option>Challenger (Provocative)</option>
                  <option>Data-Driven & Analytical</option>
                </select>
              </div>
            </div>

          </div>

          {message && (
            <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving Agent Memory...
                </>
              ) : (
                'Save Agent Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
