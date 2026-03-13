'use client';

import { useState } from 'react';
import { TerminalLoader } from '@/components/TerminalLoader';

// --- Data Contracts ---
interface SalesTrigger {
  trigger_type: string;
  evidence: string;
  relevance_score: number;
}

interface ScoutOutput {
  full_name: string;
  linkedin_url: string;
  current_headline: string;
  key_insights: SalesTrigger[];
  suggested_opening_line: string;
}

export default function Home() {
  const [mode, setMode] = useState<'url' | 'keywords'>('keywords');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoutOutput[]>([]);
  const [error, setError] = useState('');

  const runScout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const endpoint =
        mode === 'url' ? 'http://127.0.0.1:8000/api/research' : 'http://127.0.0.1:8000/api/hunt';

      const body =
        mode === 'url'
          ? { linkedin_url: query }
          : {
              keywords: query,
              user_id: 'a9d8371f-c50e-4eb9-891f-65329c972681',
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch data');
      }

      const data = await response.json();

      // Normalize data so we always have an array of results to render
      if (mode === 'url') {
        setResults([data]);
      } else {
        setResults(data.results);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] p-8 font-sans pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3 pt-8">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Ghost SDR
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
            Intent-based AI Lead Generation
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setMode('keywords')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                mode === 'keywords'
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Hunt by Keywords
            </button>
            <button
              onClick={() => setMode('url')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                mode === 'url'
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Enrich Target URL
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={runScout} className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
          <input
            type={mode === 'url' ? 'url' : 'text'}
            required
            placeholder={
              mode === 'url'
                ? 'https://www.linkedin.com/in/target-profile/'
                : 'e.g., VP Engineering New York hiring React'
            }
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg whitespace-nowrap"
          >
            {loading ? 'Initializing...' : mode === 'keywords' ? 'Hunt Leads' : 'Analyze Target'}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800/50 max-w-3xl mx-auto font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Terminal Loading State */}
        {loading && <TerminalLoader mode={mode} />}

        {/* Results Feed */}
        {!loading && results.length > 0 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12">
            <div className="border-b-2 border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Qualified Targets ({results.length})
              </h2>
            </div>

            {results.map((result, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Profile Header */}
                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {result.full_name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {result.current_headline}
                    </p>
                  </div>
                  {result.linkedin_url && (
                    <a
                      href={result.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      View Profile ↗
                    </a>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {/* The Opener */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-inner">
                    <h3 className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-widest mb-2">
                      Generated Email Opener
                    </h3>
                    <p className="text-lg text-indigo-950 dark:text-indigo-200 italic leading-relaxed">
                      "{result.suggested_opening_line}"
                    </p>
                  </div>

                  {/* Triggers Bento Grid */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                      Qualification Engine Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.key_insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col"
                        >
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                              {insight.trigger_type}
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                                insight.relevance_score >= 9
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                                  : insight.relevance_score >= 7
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {insight.relevance_score}/10
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm flex-1 leading-relaxed">
                            {insight.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}